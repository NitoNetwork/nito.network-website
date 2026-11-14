"""Install the production whitepaper synchronizer after publishing the matching site build."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import pwd
import re
import shutil
import subprocess

LOCATION = """    location = /whitepaper-data/current.json {
        alias /var/lib/nito-site-whitepaper/public/current.json;
        default_type application/json;
        expires 60s;
        etag on;
        access_log off;
    }

    location ^~ /whitepaper-data/ {
        alias /var/lib/nito-site-whitepaper/public/;
        autoindex off;
        expires 1d;
        etag on;
        access_log off;
    }

"""


def configure_vhost(original):
    names = re.findall(r'^\s*server_name\s+([^;]+);', original, re.M)
    expected = {'nito.network', 'www.nito.network'}
    if len(names) != 2 or any(set(value.split()) != expected for value in names):
        raise RuntimeError('Only the Nito Network HTTP/HTTPS vhost is authorized')
    if original.count('access_log off;') < 2 or original.count('error_log /dev/null crit;') != 2:
        raise RuntimeError('Existing no-retention policy is missing')
    if 'location = /whitepaper-data/current.json' in original:
        if LOCATION.strip() not in original:
            raise RuntimeError('Unexpected existing whitepaper location')
        return original
    anchor = '    location / {\n        try_files $uri $uri/ =404;'
    if original.count(anchor) != 1:
        raise RuntimeError('Unexpected production static location')
    return original.replace(anchor, LOCATION + anchor)


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    args = parser.parse_args()
    root = Path(args.source).resolve(strict=True)
    runtime = Path('/opt/nito-site-runtime/current')
    if runtime.resolve(strict=True) != root or not root.is_relative_to('/opt/nito-site-runtime/releases'):
        raise RuntimeError('Only the active production runtime is authorized')
    commit = (root / 'DEPLOYED_COMMIT').read_text().strip()
    if json.loads((root / 'dist/build.json').read_text())['commit'] != commit:
        raise RuntimeError('Deployed source/build mismatch')
    target = Path('/etc/nginx/sites-enabled/nito.network').resolve(strict=True)
    if not target.is_relative_to('/etc/nginx') or not target.is_file():
        raise RuntimeError('Unexpected vhost path')
    original = target.read_text()
    updated = configure_vhost(original)
    services = ['nginx', 'nito', 'fixedcoind', 'electrumx', 'pm2-root']
    before = {s: run('systemctl', 'show', s, '-p', 'MainPID', '-p', 'ActiveState') for s in services}
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path('/var/backups/nito-network') / ('whitepaper-' + stamp)
    backup.mkdir(mode=0o700, parents=True)
    shutil.copy2(target, backup / 'nito.network.conf')
    units = [Path('/etc/systemd/system/nito-site-whitepaper.' + ext) for ext in ['service', 'timer']]
    existing = {path: path.read_bytes() if path.exists() else None for path in units}
    for path, content in existing.items():
        if content is not None:
            (backup / path.name).write_bytes(content)
    try:
        try:
            account = pwd.getpwnam('nito-site-whitepaper')
            if account.pw_uid == 0 or account.pw_shell not in ['/usr/sbin/nologin', '/sbin/nologin']:
                raise RuntimeError('Unexpected whitepaper synchronizer account')
        except KeyError:
            run('useradd', '--system', '--user-group', '--no-create-home', '--shell', '/usr/sbin/nologin', 'nito-site-whitepaper')
        for path in units:
            shutil.copyfile(root / 'source/deploy' / path.name, path)
            path.chmod(0o644)
        run('systemd-analyze', 'verify', *map(str, units))
        run('systemctl', 'daemon-reload')
        run('systemctl', 'start', 'nito-site-whitepaper.service')
        snapshot = json.loads(Path('/var/lib/nito-site-whitepaper/public/current.json').read_text())
        revision = snapshot['revision']
        if not re.fullmatch(r'[0-9a-f]{40}', revision) or snapshot['chapterCount'] < 1:
            raise RuntimeError('Invalid synchronized whitepaper')
        document = json.loads((Path('/var/lib/nito-site-whitepaper/public') / revision / 'document.json').read_text())
        if document['revision'] != revision:
            raise RuntimeError('Whitepaper metadata/content mismatch')
        temporary = target.with_name(target.name + '.whitepaper-tmp')
        temporary.write_text(updated)
        shutil.copymode(target, temporary)
        temporary.replace(target)
        run('nginx', '-t')
        if updated != original:
            run('nginx', '-s', 'reload')
        run('systemctl', 'enable', '--now', 'nito-site-whitepaper.timer')
        after = {s: run('systemctl', 'show', s, '-p', 'MainPID', '-p', 'ActiveState') for s in services}
        if before != after:
            raise RuntimeError('Unrelated service state changed')
    except Exception:
        shutil.copy2(backup / 'nito.network.conf', target)
        run('nginx', '-t')
        run('nginx', '-s', 'reload')
        if existing[units[1]] is None:
            run('systemctl', 'disable', '--now', 'nito-site-whitepaper.timer')
        for path, content in existing.items():
            if content is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(content)
        run('systemctl', 'daemon-reload')
        raise
    print(json.dumps({'commit': commit, 'backup': str(backup), 'whitepaper synchronizer': 'enabled', 'other_services_unchanged': True}))


if __name__ == '__main__':
    main()
