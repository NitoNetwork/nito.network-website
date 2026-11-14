import type { Locale } from "../data";

const en = {
  eyebrow: "The next step for Nito",
  title: "Bech32x · Orchard",
  intro:
    "At activation, Orchard will add optional shielded transfers: sender, recipient and amount stay private in fully shielded transactions. Transparent transfers remain available.",
  activeIntro:
    "Orchard enables optional shielded transfers: sender, recipient and amount stay private in fully shielded transactions. Transparent transfers remain available.",
  learn: "Understand Orchard",
  target: "Activation block",
  height: "Observed block",
  remaining: "Blocks remaining",
  eta: "Estimated time remaining",
  estimatedDate: "Estimated activation",
  updated: "Last checked",
  source: "Block explorer",
  loading: "Checking network status",
  unavailable: "Network data temporarily unavailable",
  scheduled: "Activation ahead",
  stale: "Last known data · update delayed",
  slow: "No recent block · estimate suspended",
  reached: "Target height reached · confirmation pending",
  active: "Orchard activation confirmed",
  estimateNote:
    "Estimate based on the last 1,440 blocks; it changes with the network’s pace.",
  days: "d",
  hours: "h",
  minutes: "min",
  pending: "Awaiting confirmation",
  distinctionTitle: "An address format. A privacy protocol.",
  distinction:
    "Bech32x identifies Nito’s shielded addresses, starting with nito1x on mainnet. Orchard is the protocol that protects the transfers. Bech32 remains the default transparent address type; Bech32x is an explicit choice in a compatible wallet.",
  flowTitle: "Verified without publishing the private details",
  notesTitle: "Represent the funds",
  notes:
    "Funds are represented as private notes. The blockchain records cryptographic commitments, while encrypted note data lets the recipient detect and recover their funds.",
  proofTitle: "Prove the transaction",
  proof:
    "Halo2 zero-knowledge proofs let nodes verify Orchard’s transaction rules without revealing the private notes’ recipients or amounts. Orchard’s proof system does not require a trusted setup ceremony.",
  nullifierTitle: "Prevent double spending",
  nullifier:
    "Spending a note publishes a unique nullifier. Nodes reject a nullifier that has already been used, without publicly linking it to the original note commitment.",
  scopeTitle: "What is protected, what stays public",
  scope:
    "A fully shielded transfer hides sender, recipient and amount. Transfers between transparent and shielded funds reveal the value crossing that boundary. Transaction identifiers, commitments, nullifiers and encrypted data remain public; network traffic can still reveal information outside the blockchain.",
  benefitTitle: "More choice. The same Nito network.",
  benefit:
    "Orchard adds optional on-chain privacy without replacing transparent transfers or changing SHA-256 mining, block rewards or the issuance schedule. Every node can still verify the applicable rules.",
  operatorsTitle: "Prepare before activation",
  operators:
    "Node, pool and indexer operators need an officially released compatible version before the activation block. Shielded transfers also require a compatible wallet and synchronized services. An activation height does not mean that every wallet already supports Bech32x.",
  specification: "Orchard specification (ZIP 224)",
};

export type OrchardCopy = typeof en;
export const orchardTranslations: Record<Locale, OrchardCopy> = {
  en,
  fr: {
    eyebrow: "La prochaine étape de Nito",
    title: "Bech32x · Orchard",
    intro:
      "À son activation, Orchard permettra de choisir des transferts protégés : expéditeur, destinataire et montant seront masqués pour les transactions entièrement protégées. Les transferts transparents resteront disponibles.",
    activeIntro:
      "Orchard permet de choisir des transferts protégés : expéditeur, destinataire et montant sont masqués pour les transactions entièrement protégées. Les transferts transparents restent disponibles.",
    learn: "Comprendre Orchard",
    target: "Bloc d’activation",
    height: "Bloc observé",
    remaining: "Blocs restants",
    eta: "Temps restant estimé",
    estimatedDate: "Activation estimée",
    updated: "Dernière vérification",
    source: "Explorateur de blocs",
    loading: "Vérification de l’état du réseau",
    unavailable: "Données du réseau temporairement indisponibles",
    scheduled: "Activation à venir",
    stale: "Dernières données connues · actualisation retardée",
    slow: "Aucun bloc récent · estimation suspendue",
    reached: "Bloc cible atteint · confirmation en attente",
    active: "Activation Orchard confirmée",
    estimateNote:
      "Estimation sur les 1 440 derniers blocs, révisée selon le rythme du réseau.",
    days: "j",
    hours: "h",
    minutes: "min",
    pending: "En attente de confirmation",
    distinctionTitle: "Un format d’adresse. Un protocole de confidentialité.",
    distinction:
      "Bech32x désigne les adresses protégées de Nito, qui commencent par nito1x sur le réseau principal. Orchard est le protocole qui protège les transferts. Bech32 reste le type d’adresse transparent par défaut ; Bech32x se choisit explicitement dans un portefeuille compatible.",
    flowTitle: "Vérifier sans publier les détails privés",
    notesTitle: "Représenter les fonds",
    notes:
      "Les fonds sont représentés par des notes privées. La blockchain enregistre leurs engagements cryptographiques, tandis que les données chiffrées des notes permettent au destinataire de détecter et de récupérer ses fonds.",
    proofTitle: "Prouver la transaction",
    proof:
      "Les preuves à divulgation nulle de connaissance Halo2 permettent aux nœuds de vérifier les règles des transactions Orchard sans révéler les destinataires ni les montants des notes privées. Le système de preuve d’Orchard ne nécessite pas de cérémonie de configuration de confiance.",
    nullifierTitle: "Empêcher la double dépense",
    nullifier:
      "La dépense d’une note publie un identifiant unique, le nullifier. Les nœuds rejettent un nullifier déjà utilisé, sans le relier publiquement à l’engagement de la note d’origine.",
    scopeTitle: "Ce qui est protégé, ce qui reste public",
    scope:
      "Un transfert entièrement protégé masque l’expéditeur, le destinataire et le montant. Les passages entre fonds transparents et protégés révèlent la valeur qui franchit cette frontière. Les identifiants de transaction, engagements, nullifiers et données chiffrées restent publics ; le trafic réseau peut encore révéler des informations en dehors de la blockchain.",
    benefitTitle: "Plus de choix. Le même réseau Nito.",
    benefit:
      "Orchard ajoute une confidentialité facultative sur la blockchain, sans remplacer les transferts transparents ni modifier le minage SHA-256, les récompenses de bloc ou le calendrier d’émission. Chaque nœud peut toujours vérifier les règles applicables.",
    operatorsTitle: "Se préparer avant l’activation",
    operators:
      "Les opérateurs de nœuds, de pools et d’indexeurs doivent utiliser une version compatible officiellement publiée avant le bloc d’activation. Les transferts protégés nécessitent aussi un portefeuille compatible et des services synchronisés. Une hauteur d’activation ne signifie pas que tous les portefeuilles prennent déjà en charge Bech32x.",
    specification: "Spécification Orchard (ZIP 224)",
  },
  de: {
    eyebrow: "Der nächste Schritt für Nito",
    title: "Bech32x · Orchard",
    intro:
      "Mit der Aktivierung ermöglicht Orchard optional geschützte Übertragungen: Bei vollständig geschützten Transaktionen bleiben Absender, Empfänger und Betrag verborgen. Transparente Übertragungen bleiben verfügbar.",
    activeIntro:
      "Orchard ermöglicht optional geschützte Übertragungen: Bei vollständig geschützten Transaktionen bleiben Absender, Empfänger und Betrag verborgen. Transparente Übertragungen bleiben verfügbar.",
    learn: "Orchard verstehen",
    target: "Aktivierungsblock",
    height: "Beobachteter Block",
    remaining: "Verbleibende Blöcke",
    eta: "Geschätzte Restzeit",
    estimatedDate: "Geschätzte Aktivierung",
    updated: "Zuletzt geprüft",
    source: "Block-Explorer",
    loading: "Netzwerkstatus wird geprüft",
    unavailable: "Netzwerkdaten vorübergehend nicht verfügbar",
    scheduled: "Aktivierung steht bevor",
    stale: "Letzte bekannte Daten · Aktualisierung verzögert",
    slow: "Kein neuer Block · Schätzung ausgesetzt",
    reached: "Zielhöhe erreicht · Bestätigung ausstehend",
    active: "Orchard-Aktivierung bestätigt",
    estimateNote:
      "Schätzung anhand der letzten 1.440 Blöcke; sie passt sich dem Tempo des Netzwerks an.",
    days: "T",
    hours: "Std.",
    minutes: "Min.",
    pending: "Bestätigung ausstehend",
    distinctionTitle: "Ein Adressformat. Ein Datenschutzprotokoll.",
    distinction:
      "Bech32x bezeichnet Nitos geschützte Adressen, die im Hauptnetz mit nito1x beginnen. Orchard ist das Protokoll zum Schutz der Übertragungen. Bech32 bleibt der standardmäßige transparente Adresstyp; Bech32x wird in einer kompatiblen Wallet ausdrücklich ausgewählt.",
    flowTitle: "Prüfen, ohne private Details zu veröffentlichen",
    notesTitle: "Guthaben kryptografisch festhalten",
    notes:
      "Guthaben wird durch private Notes dargestellt. Die Blockchain speichert kryptografische Commitments; verschlüsselte Note-Daten ermöglichen es dem Empfänger, sein Guthaben zu erkennen und wiederherzustellen.",
    proofTitle: "Die Transaktion beweisen",
    proof:
      "Mit Halo2-Zero-Knowledge-Beweisen prüfen Knoten die Orchard-Transaktionsregeln, ohne Empfänger oder Beträge privater Notes offenzulegen. Das Beweissystem von Orchard benötigt keine vertrauenswürdige Einrichtungszeremonie (Trusted Setup).",
    nullifierTitle: "Doppelausgaben verhindern",
    nullifier:
      "Beim Ausgeben einer Note wird ein eindeutiger Nullifier veröffentlicht. Knoten lehnen bereits verwendete Nullifier ab, ohne sie öffentlich mit dem ursprünglichen Note-Commitment zu verknüpfen.",
    scopeTitle: "Was geschützt ist, was öffentlich bleibt",
    scope:
      "Vollständig geschützte Übertragungen verbergen Absender, Empfänger und Betrag. Beim Wechsel zwischen transparenten und geschützten Guthaben ist der übertragene Wert sichtbar. Transaktionskennungen, Commitments, Nullifier und verschlüsselte Daten bleiben öffentlich; der Netzwerkverkehr kann weiterhin Informationen außerhalb der Blockchain offenlegen.",
    benefitTitle: "Mehr Wahlfreiheit. Dasselbe Nito-Netzwerk.",
    benefit:
      "Orchard ergänzt optionalen Datenschutz auf der Blockchain, ohne transparente Übertragungen zu ersetzen oder SHA-256-Mining, Blockbelohnungen und Emissionsplan zu verändern. Jeder Knoten kann die geltenden Regeln weiterhin überprüfen.",
    operatorsTitle: "Vor der Aktivierung vorbereiten",
    operators:
      "Betreiber von Knoten, Pools und Indexern benötigen vor dem Aktivierungsblock eine offiziell veröffentlichte kompatible Version. Geschützte Übertragungen erfordern außerdem eine kompatible Wallet und synchronisierte Dienste. Eine Aktivierungshöhe bedeutet nicht, dass jede Wallet Bech32x bereits unterstützt.",
    specification: "Orchard-Spezifikation (ZIP 224)",
  },
  es: {
    eyebrow: "El siguiente paso de Nito",
    title: "Bech32x · Orchard",
    intro:
      "Al activarse, Orchard permitirá elegir transferencias protegidas: el remitente, el destinatario y el importe quedarán ocultos en las transacciones totalmente protegidas. Las transferencias transparentes seguirán disponibles.",
    activeIntro:
      "Orchard permite elegir transferencias protegidas: el remitente, el destinatario y el importe quedan ocultos en las transacciones totalmente protegidas. Las transferencias transparentes siguen disponibles.",
    learn: "Entender Orchard",
    target: "Bloque de activación",
    height: "Bloque observado",
    remaining: "Bloques restantes",
    eta: "Tiempo restante estimado",
    estimatedDate: "Activación estimada",
    updated: "Última comprobación",
    source: "Explorador de bloques",
    loading: "Comprobando el estado de la red",
    unavailable: "Datos de la red temporalmente no disponibles",
    scheduled: "Activación pendiente",
    stale: "Últimos datos conocidos · actualización retrasada",
    slow: "Sin bloques recientes · estimación suspendida",
    reached: "Altura objetivo alcanzada · pendiente de confirmación",
    active: "Activación de Orchard confirmada",
    estimateNote:
      "Estimación basada en los últimos 1440 bloques; varía según el ritmo de la red.",
    days: "d",
    hours: "h",
    minutes: "min",
    pending: "Pendiente de confirmación",
    distinctionTitle: "Un formato de dirección. Un protocolo de privacidad.",
    distinction:
      "Bech32x identifica las direcciones protegidas de Nito, que empiezan por nito1x en la red principal. Orchard es el protocolo que protege las transferencias. Bech32 sigue siendo el tipo de dirección transparente predeterminado; Bech32x se elige expresamente en una cartera compatible.",
    flowTitle: "Verificar sin publicar los detalles privados",
    notesTitle: "Representar los fondos",
    notes:
      "Los fondos se representan mediante notas privadas. La blockchain registra compromisos criptográficos, mientras que los datos cifrados de las notas permiten al destinatario detectar y recuperar sus fondos.",
    proofTitle: "Demostrar la transacción",
    proof:
      "Las pruebas de conocimiento cero Halo2 permiten a los nodos verificar las reglas de las transacciones Orchard sin revelar los destinatarios ni los importes de las notas privadas. El sistema de pruebas de Orchard no requiere una ceremonia de configuración de confianza.",
    nullifierTitle: "Impedir el doble gasto",
    nullifier:
      "Al gastar una nota se publica un identificador único, el nullifier. Los nodos rechazan un nullifier ya utilizado sin vincularlo públicamente con el compromiso de la nota original.",
    scopeTitle: "Qué se protege y qué sigue siendo público",
    scope:
      "Una transferencia totalmente protegida oculta remitente, destinatario e importe. Los movimientos entre fondos transparentes y protegidos revelan el valor que cruza esa frontera. Los identificadores de transacción, compromisos, nullifiers y datos cifrados siguen siendo públicos; el tráfico de red aún puede revelar información fuera de la blockchain.",
    benefitTitle: "Más opciones. La misma red Nito.",
    benefit:
      "Orchard añade privacidad opcional en la blockchain sin sustituir las transferencias transparentes ni cambiar la minería SHA-256, las recompensas por bloque o el calendario de emisión. Cada nodo puede seguir verificando las reglas aplicables.",
    operatorsTitle: "Prepararse antes de la activación",
    operators:
      "Los operadores de nodos, pools e indexadores necesitan una versión compatible publicada oficialmente antes del bloque de activación. Las transferencias protegidas también requieren una cartera compatible y servicios sincronizados. Una altura de activación no significa que todas las carteras ya admitan Bech32x.",
    specification: "Especificación de Orchard (ZIP 224)",
  },
  nl: {
    eyebrow: "De volgende stap voor Nito",
    title: "Bech32x · Orchard",
    intro:
      "Na activering maakt Orchard optionele afgeschermde overdrachten mogelijk: afzender, ontvanger en bedrag blijven verborgen bij volledig afgeschermde transacties. Transparante overdrachten blijven beschikbaar.",
    activeIntro:
      "Orchard maakt optionele afgeschermde overdrachten mogelijk: afzender, ontvanger en bedrag blijven verborgen bij volledig afgeschermde transacties. Transparante overdrachten blijven beschikbaar.",
    learn: "Orchard begrijpen",
    target: "Activeringsblok",
    height: "Waargenomen blok",
    remaining: "Resterende blokken",
    eta: "Geschatte resterende tijd",
    estimatedDate: "Geschatte activering",
    updated: "Laatst gecontroleerd",
    source: "Blokverkenner",
    loading: "Netwerkstatus controleren",
    unavailable: "Netwerkgegevens tijdelijk niet beschikbaar",
    scheduled: "Activering volgt",
    stale: "Laatst bekende gegevens · update vertraagd",
    slow: "Geen recent blok · schatting opgeschort",
    reached: "Doelhoogte bereikt · bevestiging volgt",
    active: "Orchard-activering bevestigd",
    estimateNote:
      "Schatting op basis van de laatste 1.440 blokken; deze verandert met het tempo van het netwerk.",
    days: "d",
    hours: "u",
    minutes: "min",
    pending: "Wachten op bevestiging",
    distinctionTitle: "Een adresformaat. Een privacyprotocol.",
    distinction:
      "Bech32x duidt de afgeschermde adressen van Nito aan, die op het hoofdnetwerk met nito1x beginnen. Orchard is het protocol dat overdrachten beschermt. Bech32 blijft het standaard transparante adrestype; Bech32x wordt bewust gekozen in een compatibele wallet.",
    flowTitle: "Controleren zonder privégegevens openbaar te maken",
    notesTitle: "Tegoeden cryptografisch vastleggen",
    notes:
      "Tegoeden worden als private notes weergegeven. De blockchain slaat cryptografische commitments op; versleutelde notegegevens laten de ontvanger zijn tegoeden herkennen en herstellen.",
    proofTitle: "De transactie bewijzen",
    proof:
      "Met Halo2-zero-knowledge-bewijzen kunnen nodes de transactieregels van Orchard controleren zonder ontvangers of bedragen van private notes te onthullen. Het bewijssysteem van Orchard vereist geen vertrouwde initialisatieceremonie (trusted setup).",
    nullifierTitle: "Dubbele uitgaven voorkomen",
    nullifier:
      "Bij het uitgeven van een note wordt een unieke nullifier gepubliceerd. Nodes weigeren een eerder gebruikte nullifier, zonder deze publiek aan het oorspronkelijke note-commitment te koppelen.",
    scopeTitle: "Wat beschermd is en wat openbaar blijft",
    scope:
      "Een volledig afgeschermde overdracht verbergt afzender, ontvanger en bedrag. Overdrachten tussen transparante en afgeschermde tegoeden tonen de waarde die die grens passeert. Transactie-ID’s, commitments, nullifiers en versleutelde gegevens blijven openbaar; netwerkverkeer kan nog steeds informatie buiten de blockchain onthullen.",
    benefitTitle: "Meer keuze. Hetzelfde Nito-netwerk.",
    benefit:
      "Orchard voegt optionele privacy op de blockchain toe zonder transparante overdrachten te vervangen of SHA-256-mining, blokbeloningen of het uitgifteschema te veranderen. Elke node kan de geldende regels nog steeds controleren.",
    operatorsTitle: "Voorbereiden op de activering",
    operators:
      "Beheerders van nodes, pools en indexers hebben vóór het activeringsblok een officieel uitgebrachte compatibele versie nodig. Afgeschermde overdrachten vereisen ook een compatibele wallet en gesynchroniseerde diensten. Een activeringshoogte betekent niet dat elke wallet Bech32x al ondersteunt.",
    specification: "Orchard-specificatie (ZIP 224)",
  },
  ru: {
    eyebrow: "Следующий этап Nito",
    title: "Bech32x · Orchard",
    intro:
      "После активации Orchard позволит выбирать защищённые переводы: в полностью защищённых транзакциях отправитель, получатель и сумма будут скрыты. Прозрачные переводы останутся доступны.",
    activeIntro:
      "Orchard позволяет выбирать защищённые переводы: в полностью защищённых транзакциях отправитель, получатель и сумма скрыты. Прозрачные переводы остаются доступны.",
    learn: "Как работает Orchard",
    target: "Блок активации",
    height: "Наблюдаемый блок",
    remaining: "Осталось блоков",
    eta: "Оценка оставшегося времени",
    estimatedDate: "Ожидаемая активация",
    updated: "Последняя проверка",
    source: "Обозреватель блоков",
    loading: "Проверка состояния сети",
    unavailable: "Данные сети временно недоступны",
    scheduled: "Ожидается активация",
    stale: "Последние известные данные · обновление задерживается",
    slow: "Нет свежих блоков · оценка приостановлена",
    reached: "Целевая высота достигнута · ожидается подтверждение",
    active: "Активация Orchard подтверждена",
    estimateNote:
      "Оценка по последним 1440 блокам меняется вместе с темпом работы сети.",
    days: "д",
    hours: "ч",
    minutes: "мин",
    pending: "Ожидается подтверждение",
    distinctionTitle: "Формат адреса и протокол конфиденциальности.",
    distinction:
      "Bech32x обозначает защищённые адреса Nito, начинающиеся с nito1x в основной сети. Orchard — протокол защиты переводов. Bech32 остаётся прозрачным типом адреса по умолчанию; Bech32x нужно явно выбрать в совместимом кошельке.",
    flowTitle: "Проверка без раскрытия частных данных",
    notesTitle: "Криптографическая фиксация средств",
    notes:
      "Средства представлены приватными записями — notes. Блокчейн хранит криптографические обязательства, а зашифрованные данные notes позволяют получателю обнаруживать и восстанавливать свои средства.",
    proofTitle: "Доказательство транзакции",
    proof:
      "Доказательства с нулевым разглашением Halo2 позволяют узлам проверять правила транзакций Orchard, не раскрывая получателей и суммы приватных notes. Система доказательств Orchard не требует церемонии доверенной настройки.",
    nullifierTitle: "Защита от двойной траты",
    nullifier:
      "При расходовании note публикуется уникальный идентификатор — nullifier. Узлы отклоняют уже использованный nullifier, не связывая его публично с исходным криптографическим обязательством note.",
    scopeTitle: "Что защищено, а что остаётся публичным",
    scope:
      "Полностью защищённый перевод скрывает отправителя, получателя и сумму. При переходе между прозрачными и защищёнными средствами видна сумма, пересекающая эту границу. Идентификаторы транзакций, обязательства, nullifiers и зашифрованные данные остаются публичными; сетевой трафик всё ещё может раскрывать информацию за пределами блокчейна.",
    benefitTitle: "Больше выбора. Та же сеть Nito.",
    benefit:
      "Orchard добавляет необязательную конфиденциальность в блокчейне, не заменяя прозрачные переводы и не меняя майнинг SHA-256, награды за блоки или график эмиссии. Каждый узел по-прежнему может проверять действующие правила.",
    operatorsTitle: "Подготовка к активации",
    operators:
      "До блока активации операторам узлов, пулов и индексаторов нужна официально выпущенная совместимая версия. Защищённые переводы также требуют совместимого кошелька и синхронизированных сервисов. Высота активации не означает, что все кошельки уже поддерживают Bech32x.",
    specification: "Спецификация Orchard (ZIP 224)",
  },
  cn: {
    eyebrow: "Nito 的下一步",
    title: "Bech32x · Orchard",
    intro:
      "激活后，Orchard 将提供可选的屏蔽转账：完全屏蔽交易的发送方、接收方和金额都将被隐藏。透明转账仍可使用。",
    activeIntro:
      "Orchard 提供可选的屏蔽转账：完全屏蔽交易的发送方、接收方和金额都被隐藏。透明转账仍可使用。",
    learn: "了解 Orchard",
    target: "激活区块",
    height: "已观测区块",
    remaining: "剩余区块",
    eta: "预计剩余时间",
    estimatedDate: "预计激活时间",
    updated: "上次检查",
    source: "区块浏览器",
    loading: "正在检查网络状态",
    unavailable: "网络数据暂时不可用",
    scheduled: "等待激活",
    stale: "最近已知数据 · 更新延迟",
    slow: "暂无新区块 · 暂停估算",
    reached: "已达到目标高度 · 等待确认",
    active: "Orchard 激活已确认",
    estimateNote: "根据最近 1,440 个区块估算，随网络出块速度调整。",
    days: "天",
    hours: "小时",
    minutes: "分钟",
    pending: "等待确认",
    distinctionTitle: "地址格式与隐私协议，各有分工。",
    distinction:
      "Bech32x 是 Nito 的屏蔽地址格式，在主网上以 nito1x 开头。Orchard 是保护转账的协议。Bech32 仍是默认的透明地址类型；使用 Bech32x 需要在兼容的钱包中主动选择。",
    flowTitle: "验证交易，无需公开私密细节",
    notesTitle: "以承诺记录资金",
    notes:
      "资金以私密票据（note）表示。区块链记录密码学承诺，接收方则通过加密的票据数据发现并恢复自己的资金。",
    proofTitle: "证明交易有效",
    proof:
      "Halo2 零知识证明让节点能够验证 Orchard 交易规则，而无需公开私密票据的接收方或金额。Orchard 的证明系统不需要可信设置仪式。",
    nullifierTitle: "防止双重花费",
    nullifier:
      "花费票据时会公布唯一的作废标识（nullifier）。节点拒绝已使用过的标识，而不会在公开数据中将其与原票据承诺关联。",
    scopeTitle: "哪些受到保护，哪些仍然公开",
    scope:
      "完全屏蔽的转账隐藏发送方、接收方和金额。资金在透明与屏蔽状态之间转移时，跨越这一边界的金额可见。交易标识、承诺、作废标识和加密数据仍然公开；区块链之外的网络流量仍可能透露信息。",
    benefitTitle: "更多选择，同一个 Nito 网络。",
    benefit:
      "Orchard 增加可选的链上隐私保护，不取代透明转账，也不改变 SHA-256 挖矿、区块奖励或发行计划。每个节点仍可验证适用的规则。",
    operatorsTitle: "在激活前做好准备",
    operators:
      "节点、矿池和索引服务运营者需要在激活区块之前使用已正式发布的兼容版本。屏蔽转账还需要兼容的钱包和已同步的服务。设定了激活高度，并不意味着所有钱包都已支持 Bech32x。",
    specification: "Orchard 规范（ZIP 224）",
  },
};
