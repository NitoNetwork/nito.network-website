# Security Policy

## Supported Version

Security fixes target the current `main` branch and the version deployed at
[nito.network](https://nito.network).

## Reporting A Vulnerability

Do not disclose a suspected vulnerability in a public issue, discussion or pull
request. Use the repository's **Security** tab and open a private security
advisory:

<https://github.com/NitoNetwork/nito.network-website/security/advisories/new>

If the advisory form is unavailable, contact `help@nito.network`. Use a concise
subject that identifies this website and do not attach wallet secrets or unrelated
personal data.

Include the affected route or file, reproduction steps, expected impact and any
suggested mitigation. Do not include real wallet seeds, private keys, passwords
or personal information in a report.

The website is informational and does not custody funds. Reports concerning Nito
Core, wallets, explorers or mining services should be filed privately with the
maintainers of the affected project instead of this repository.

## Scope Notes

- Browser preferences are intentionally local and are not authentication data.
- Public release metadata comes from official GitHub repositories.
- Orchard and whitepaper collectors process public upstream data only.
- EasyNode generates a script locally; RPC credentials are created or entered on
  the target host and must never be submitted to this website.
