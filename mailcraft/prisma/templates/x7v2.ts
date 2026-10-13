// X7 Casino V2 (Midnight V3) master template config.
// Defaults are taken verbatim from Approved Emails/X7 Casino V2/x7v2-template-{LANG}.html.
// Shared by prisma/seed.ts (full reseed) and prisma/seed-x7v2.ts (add-only, safe for prod).

export const X7_V2_SLUG = 'x7-casino-v2-template'
export const X7_V2_LANGUAGES = ['en', 'fr', 'de', 'it', 'es']

export const x7v2EditableFields = [
  // Header
  {
    key: 'LOGO_LINK', label: 'Logo Link', type: 'url', group: 'Header',
    defaultValues: {
      en: 'https://x7casino.com/',
      fr: 'https://x7casino.com/',
      de: 'https://x7casino2.com/',
      it: 'https://x7casino.com/',
      es: 'https://x7casino.com/',
    },
  },
  {
    key: 'BANNER_IMG', label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true,
    placeholder: 'https://userimg-assets.customeriomail.com/...',
    defaultValue: 'https://userimg-assets.customeriomail.com/images/client-env-66535/01M4D7WYGJRCEXENRBTQRMDV28.png',
  },
  {
    key: 'BANNER_LINK', label: 'Banner Link', type: 'url', group: 'Header',
    defaultValues: {
      en: 'https://x7casino.com/en/promotions',
      fr: 'https://x7casino.com/fr/promotions',
      de: 'https://x7casino2.com/de/promotions',
      it: 'https://x7casino.com/it/promotions',
      es: 'https://x7casino.com/es/promotions',
    },
  },

  // Body
  {
    key: 'GREETING', label: 'Greeting', type: 'text', group: 'Body',
    defaultValues: {
      en: 'Hello',
      fr: 'Salut',
      de: 'Hallo',
      it: 'Ciao',
      es: 'Hola',
    },
  },
  {
    key: 'BODY_CONTENT', label: 'Body Content', type: 'paragraphs', group: 'Body', defaultRequired: true,
    defaultParagraphsByLang: {
      en: [{ id: 'p1', html: 'Your next session just got <strong style="font-weight:700">50 spins </strong>better.<br><br>From <strong style="font-weight:700">September 24 to 30</strong>, claim <strong style="font-weight:700">50 Free Spins </strong>on <strong style="font-weight:700">Zeus Vs Hades Gods of War 250, Spina Colada or Le Hooligan </strong>and add some extra action to your game.<br><br>This offer is available <strong style="font-weight:700">once only</strong>, so don’t let your spins go unused.' }],
      fr: [{ id: 'p1', html: 'Votre prochaine session s’enrichit de <strong style="font-weight:700">50 tours</strong>.<br><br>Du <strong style="font-weight:700">24 au 30 septembre</strong>, réclamez <strong style="font-weight:700">50 Tours Gratuits</strong> sur <strong style="font-weight:700">Zeus Vs Hades Gods of War 250, Spina Colada ou Le Hooligan</strong> et ajoutez encore plus d’action à votre jeu.<br><br>Cette offre n’est disponible <strong style="font-weight:700">qu’une seule fois</strong>, alors ne laissez pas vos tours inutilisés.' }],
      de: [{ id: 'p1', html: 'Deine nächste Session wird um <strong style="font-weight:700">50 Spins</strong> besser.<br><br>Sichere dir vom <strong style="font-weight:700">24. bis 30. September</strong> <strong style="font-weight:700">50 Freispiele</strong> für <strong style="font-weight:700">Zeus Vs Hades Gods of War 250, Spina Colada oder Le Hooligan</strong> und bring noch mehr Action in dein Spiel.<br><br>Dieses Angebot ist nur <strong style="font-weight:700">einmalig</strong> verfügbar – lass deine Spins also nicht verfallen.' }],
      it: [{ id: 'p1', html: 'La tua prossima sessione si arricchisce di <strong style="font-weight:700">50 giri</strong>.<br><br>Dal <strong style="font-weight:700">24 al 30 settembre</strong>, riscatta <strong style="font-weight:700">50 Giri Gratis</strong> su <strong style="font-weight:700">Zeus Vs Hades Gods of War 250, Spina Colada o Le Hooligan</strong> e aggiungi un po’ di azione in più al tuo gioco.<br><br>Questa offerta è disponibile <strong style="font-weight:700">una sola volta</strong>, quindi non lasciare che i tuoi giri vadano sprecati.' }],
      es: [{ id: 'p1', html: 'Tu próxima sesión acaba de mejorar con <strong style="font-weight:700">50 giros</strong>.<br><br>Del <strong style="font-weight:700">24 al 30 de septiembre</strong>, reclama <strong style="font-weight:700">50 Giros Gratis</strong> en <strong style="font-weight:700">Zeus Vs Hades Gods of War 250, Spina Colada o Le Hooligan</strong> y añade más acción a tu juego.<br><br>Esta oferta está disponible <strong style="font-weight:700">solo una vez</strong>, así que no dejes que tus giros se pierdan.' }],
    },
  },
  {
    key: 'CTA_TEXT', label: 'CTA Button Text', type: 'text', group: 'Body',
    defaultValues: {
      en: 'Activate Spins',
      fr: 'Activer les tours',
      de: 'Spins aktivieren',
      it: 'Attiva i giri',
      es: 'Activar giros',
    },
  },
  {
    key: 'CTA_LINK', label: 'CTA Button Link', type: 'url', group: 'Body',
    defaultValues: {
      en: 'https://x7casino.com/en/promotions',
      fr: 'https://x7casino.com/fr/promotions',
      de: 'https://x7casino2.com/de/promotions',
      it: 'https://x7casino.com/it/promotions',
      es: 'https://x7casino.com/es/promotions',
    },
  },

  // Username & Password
  {
    key: 'USERNAME_LABEL', label: 'Username Label', type: 'text', group: 'Username & Password',
    defaultValues: {
      en: 'Username',
      fr: 'Nom d\'utilisateur',
      de: 'Benutzername',
      it: 'Nome utente',
      es: 'Nombre de usuario',
    },
  },
  {
    key: 'FORGOT_LABEL', label: 'Forgot Password Label', type: 'text', group: 'Username & Password',
    defaultValues: {
      en: 'Forgot your password?',
      fr: 'Mot de passe oublié ?',
      de: 'Passwort vergessen?',
      it: 'Password dimenticata?',
      es: '¿Olvidaste tu contraseña?',
    },
  },
  {
    key: 'FORGOT_CTA', label: 'Forgot Password CTA', type: 'text', group: 'Username & Password',
    defaultValues: {
      en: 'Click here',
      fr: 'Cliquez ici',
      de: 'Hier klicken',
      it: 'Clicca qui',
      es: 'Haz clic aquí',
    },
  },
  {
    key: 'FORGOT_LINK', label: 'Forgot Password Link', type: 'url', group: 'Username & Password',
    defaultValues: {
      en: 'https://x7casino.com/password-recovery',
      fr: 'https://x7casino.com/password-recovery',
      de: 'https://x7casino2.com/password-recovery',
      it: 'https://x7casino.com/password-recovery',
      es: 'https://x7casino.com/password-recovery',
    },
  },

  // Thumbnails
  {
    key: 'THUMB1_IMG', label: 'Thumbnail 1 Image', type: 'url', group: 'Thumbnails',
    defaultValue: 'https://userimg-assets.customeriomail.com/images/client-env-66535/01M4D7WYGD81JX07PDVH6K41BT.png',
  },
  {
    key: 'THUMB1_LINK', label: 'Thumbnail 1 Link', type: 'url', group: 'Thumbnails',
    defaultValues: {
      en: 'https://x7casino.com/en/promotions',
      fr: 'https://x7casino.com/fr/promotions',
      de: 'https://x7casino2.com/de/promotions',
      it: 'https://x7casino.com/it/promotions',
      es: 'https://x7casino.com/es/promotions',
    },
  },
  {
    key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails',
    defaultValues: {
      en: 'The Jackpot Club',
      fr: 'Le Jackpot Club',
      de: 'Der Jackpot Club',
      it: 'Il Jackpot Club',
      es: 'El Jackpot Club',
    },
  },
  {
    key: 'THUMB1_SUBLABEL', label: 'Thumbnail 1 Sublabel', type: 'text', group: 'Thumbnails',
    defaultValues: {
      en: 'Win up to €30,000',
      fr: 'Gagnez jusqu’à 30 000 €',
      de: 'Gewinne bis zu 30.000 €',
      it: 'Vinci fino a 30.000 €',
      es: 'Gana hasta 30.000 €',
    },
  },
  {
    key: 'THUMB2_IMG', label: 'Thumbnail 2 Image', type: 'url', group: 'Thumbnails',
    defaultValue: 'https://userimg-assets.customeriomail.com/images/client-env-66535/01M4D7WYGHV4RMXRW83GREKSMT.png',
  },
  {
    key: 'THUMB2_LINK', label: 'Thumbnail 2 Link', type: 'url', group: 'Thumbnails',
    defaultValues: {
      en: 'https://x7casino.com/en/promotions',
      fr: 'https://x7casino.com/fr/promotions',
      de: 'https://x7casino2.com/de/promotions',
      it: 'https://x7casino.com/it/promotions',
      es: 'https://x7casino.com/es/promotions',
    },
  },
  {
    key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails',
    defaultValue: 'Blasts & Races',
  },
  {
    key: 'THUMB2_SUBLABEL', label: 'Thumbnail 2 Sublabel', type: 'text', group: 'Thumbnails',
    defaultValues: {
      en: '€25M prize pool',
      fr: '25 M€ de prix à gagner',
      de: '25 Mio. € Preispool',
      it: 'Montepremi di 25 M€',
      es: '25 M€ en premios',
    },
  },

  // Terms (separate Configure section)
  {
    key: 'TERMS_TEXT', label: 'Terms & Conditions', type: 'richtext', group: 'Terms',
    defaultValues: {
      en: 'Offer valid from September 24 to 30, 2026. | Free Spins are available on Zeus Vs Hades Gods of War 250, Spina Colada or Le Hooligan. | Wagering requirement is 40x | Maximum cash out is €50 or the equivalent in any other currency. | Free Spins can be claimed once upon login. | If you have already claimed the spins prior to receiving this email, please disregard this message. | Standard X7 Casino terms and conditions apply.',
      fr: 'Offre valable du 24 au 30 septembre 2026. | Les Tours Gratuits sont disponibles sur Zeus Vs Hades Gods of War 250, Spina Colada ou Le Hooligan. | Exigence de mise : 40x | Le retrait maximum est de 50 € ou l’équivalent dans toute autre devise. | Les Tours Gratuits peuvent être réclamés une seule fois lors de la connexion. | Si vous avez déjà réclamé les tours avant de recevoir cet e-mail, veuillez ignorer ce message. | Les conditions générales standard de X7 Casino s’appliquent.',
      de: 'Angebot gültig vom 24. bis 30. September 2026. | Die Freispiele sind für Zeus Vs Hades Gods of War 250, Spina Colada oder Le Hooligan verfügbar. | Umsatzanforderung: 40x | Die maximale Auszahlung beträgt 50 € oder den Gegenwert in einer anderen Währung. | Die Freispiele können einmalig beim Login beansprucht werden. | Falls du die Spins bereits vor Erhalt dieser E-Mail beansprucht hast, ignoriere bitte diese Nachricht. | Es gelten die allgemeinen Geschäftsbedingungen von X7 Casino.',
      it: 'Offerta valida dal 24 al 30 settembre 2026. | I Giri Gratis sono disponibili su Zeus Vs Hades Gods of War 250, Spina Colada o Le Hooligan. | Requisito di puntata: 40x | Il prelievo massimo è di 50 € o l’equivalente in qualsiasi altra valuta. | I Giri Gratis possono essere riscattati una sola volta all’accesso. | Se hai già riscattato i giri prima di ricevere questa e-mail, ignora questo messaggio. | Si applicano i termini e le condizioni standard di X7 Casino.',
      es: 'Oferta válida del 24 al 30 de septiembre de 2026. | Los Giros Gratis están disponibles en Zeus Vs Hades Gods of War 250, Spina Colada o Le Hooligan. | Requisito de apuesta: 40x | El retiro máximo es de 50 € o su equivalente en cualquier otra moneda. | Los Giros Gratis se pueden reclamar una sola vez al iniciar sesión. | Si ya reclamaste los giros antes de recibir este correo electrónico, ignora este mensaje. | Se aplican los términos y condiciones estándar de X7 Casino.',
    },
  },

  // Legal (separate Configure section)
  {
    key: 'FOOTER_LICENSE', label: 'License Text', type: 'richtext', group: 'Legal',
    defaultValues: {
      en: 'This website is licensed under Starscream Limited, a company incorporated under the laws of Saint Lucia with registration number 2023-00007 and registered address in Saint Lucia. Starscream Limited is licensed and regulated in virtue of a Client Provider Authorization numbered 00952 issued on July 2023 by the Kahnawake Gaming Commission.',
      fr: 'Ce site est exploité par Starscream Limited, société immatriculée à Saint-Lucie sous le n° 2023-00007. Licenciée et réglementée en vertu de l\'Autorisation n° 00952 délivrée en juillet 2023 par la Commission des jeux de Kahnawake.',
      de: 'Diese Website wird von Starscream Limited betrieben, einem in Saint Lucia eingetragenen Unternehmen (Nr. 2023-00007). Lizenziert und reguliert gemäß der Client Provider Authorization Nr. 00952, ausgestellt im Juli 2023 von der Kahnawake Gaming Commission.',
      it: 'Questo sito è gestito da Starscream Limited, società costituita ai sensi delle leggi di Saint Lucia con numero di registrazione 2023-00007. Autorizzata e regolamentata in virtù dell\'Autorizzazione n. 00952 rilasciata nel luglio 2023 dalla Kahnawake Gaming Commission.',
      es: 'Este sitio está operado por Starscream Limited, empresa constituida bajo las leyes de Santa Lucía con número de registro 2023-00007. Licenciada y regulada en virtud de la Autorización n.° 00952 emitida en julio de 2023 por la Kahnawake Gaming Commission.',
    },
  },
  {
    key: 'FOOTER_LEGAL', label: 'Responsible Gambling Text', type: 'richtext', group: 'Legal',
    defaultValues: {
      en: 'Gambling can be addictive, please Play Responsibly. For help visit our <a href="https://x7casino.com/en/responsible-gaming" target="_blank" style="color: #888888; font-weight: 700; text-decoration: underline;">Responsible Gambling</a> page. Underage gambling is an offence. 18+',
      fr: 'Les jeux d\'argent peuvent créer une dépendance. Veuillez jouer de manière responsable. Pour obtenir de l\'aide, consultez notre page <a href="https://x7casino.com/fr/responsible-gaming" target="_blank" style="color: #888888; font-weight: 700; text-decoration: underline;">Jeu Responsable</a>. Les jeux d\'argent pour les mineurs constituent une infraction. 18+',
      de: 'Glücksspiel kann süchtig machen. Bitte spielen Sie verantwortungsbewusst. Hilfe finden Sie auf unserer Seite <a href="https://x7casino2.com/de/responsible-gaming" target="_blank" style="color: #888888; font-weight: 700; text-decoration: underline;">Verantwortungsvolles Spielen</a>. Glücksspiel durch Minderjährige ist strafbar. 18+',
      it: 'Il gioco d\'azzardo può creare dipendenza. Si prega di giocare responsabilmente. Per assistenza visita la nostra pagina <a href="https://x7casino.com/it/responsible-gaming" target="_blank" style="color: #888888; font-weight: 700; text-decoration: underline;">Gioco Responsabile</a>. Il gioco d\'azzardo da parte di minorenni è un reato. 18+',
      es: 'El juego puede crear adicción. Por favor, juega de forma responsable. Para obtener ayuda visita nuestra página de <a href="https://x7casino.com/es/responsible-gaming" target="_blank" style="color: #888888; font-weight: 700; text-decoration: underline;">Juego Responsable</a>. El juego de menores es un delito. 18+',
    },
  },
  {
    key: 'FOOTER_COPYRIGHT', label: 'Copyright', type: 'text', group: 'Legal',
    defaultValues: {
      en: '©2026 X7Casino, All Rights Reserved.',
      fr: '©2026 X7Casino, Tous droits réservés.',
      de: '©2026 X7Casino, Alle Rechte vorbehalten.',
      it: '©2026 X7Casino, Tutti i diritti riservati.',
      es: '©2026 X7Casino, Todos los derechos reservados.',
    },
  },
]

// The 18+ logo link is per-language in V2, so it stays hardcoded in each {lang}.html
// (locked fields are single-value across languages).
export const x7v2LockedFields = [
  { key: 'FOOTER_LOGO1_LINK', label: 'Play Responsibly Logo Link', value: 'https://gamingcommission.ca/interactive-gaming/players/#plLE', note: 'Play Responsibly logo href',           isReadOnly: false },
  { key: 'FOOTER_LOGO3_LINK', label: 'Kahnawake Logo Link',        value: 'https://gamingcommission.ca/interactive-gaming/players/#plLE', note: 'Kahnawake Gaming Commission logo href', isReadOnly: false },
]

// Fields refreshed on every upsert (mirrors the update block of the other master templates)
export function x7v2UpdateData(templateBaseDir: string) {
  return {
    baseFilePath: `${templateBaseDir}/master-templates/x7-v2`,
    editableFields: x7v2EditableFields,
    lockedFields: x7v2LockedFields,
    languages: X7_V2_LANGUAGES,
  }
}

export function x7v2CreateData(templateBaseDir: string) {
  return {
    name: 'X7 Casino V2',
    slug: X7_V2_SLUG,
    brand: 'X7_V2' as const,
    description: 'X7 Casino V2 (Midnight) promotional email template — 5 languages (EN, FR, DE, IT, ES)',
    isActive: true,
    ...x7v2UpdateData(templateBaseDir),
  }
}
