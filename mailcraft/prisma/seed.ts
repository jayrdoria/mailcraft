import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminPassword) throw new Error('SEED_ADMIN_PASSWORD is not set in .env')
  const crmPassword = process.env.SEED_CRM_PASSWORD
  if (!crmPassword) throw new Error('SEED_CRM_PASSWORD is not set in .env')
  const vipPassword = process.env.SEED_VIP_PASSWORD
  if (!vipPassword) throw new Error('SEED_VIP_PASSWORD is not set in .env')

  // ── Accounts ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'jayr@stakes.com' },
    update: { passwordHash: await bcrypt.hash(adminPassword, 12), name: 'Admin' },
    create: {
      email: 'jayr@stakes.com',
      name: 'Admin',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
      department: null,
      canAccessEmails: true,
    },
  })
  console.log(`✓ Admin: ${admin.email}`)

  const crm = await prisma.user.upsert({
    where: { email: 'crm@stakes.com' },
    update: { passwordHash: await bcrypt.hash(crmPassword, 12) },
    create: {
      email: 'crm@stakes.com',
      name: 'CRM Team',
      passwordHash: await bcrypt.hash(crmPassword, 12),
      role: 'DEPARTMENT',
      department: 'crm',
      canAccessEmails: true,
    },
  })
  console.log(`✓ CRM: ${crm.email}`)

  const vip = await prisma.user.upsert({
    where: { email: 'vip@stakes.com' },
    update: { passwordHash: await bcrypt.hash(vipPassword, 12) },
    create: {
      email: 'vip@stakes.com',
      name: 'VIP Team',
      passwordHash: await bcrypt.hash(vipPassword, 12),
      role: 'DEPARTMENT',
      department: 'vip',
      canAccessEmails: true,
    },
  })
  console.log(`✓ VIP: ${vip.email}`)

  const templateBaseDir = process.env.TEMPLATE_BASE_DIR ?? './data/templates'

  // ── Remove old templates ───────────────────────────────────────────────────
  await prisma.masterTemplate.deleteMany({
    where: {
      slug: {
        in: [
          'stakes-email-verification',
          'x7-email-verification',
          'stakes-jackpot-club',
          'stakes-casino-jackpot-club',
          'x7-jackpot-club',
        ],
      },
    },
  })
  console.log('✓ Cleaned up old templates')

  // ── Shared domain defaults ─────────────────────────────────────────────────
  const stakesDomains = {
    en:   'https://stakes.com/',
    fr:   'https://stakes3.com/',
    frca: 'https://stakes.com/',
    de:   'https://stakes.com/',
    it:   'https://stakes3.com/',
    es:   'https://stakes.com/',
  }

  const x7Domains = {
    en: 'https://x7casino.com/',
    fr: 'https://x7casino.com/',
    de: 'https://x7casino2.com/',
    it: 'https://x7casino.com/',
    es: 'https://x7casino.com/',
  }

  // ── Footer legal text per language (plain text — users paste/edit directly) ─
  const stakesFooterLegalByLang = {
    en:   'Gambling can be addictive, please Play Responsibly. For help visit our Responsible Gambling page. Underage gambling is an offence. 18+<br><br>Copyright ©2026 Stakes Casino.',
    fr:   "Les jeux d'argent peuvent créer une dépendance. Veuillez jouer de manière responsable. Pour obtenir de l'aide, consultez notre page Jeu Responsable. Les jeux d'argent pour les mineurs constituent une infraction. 18+<br><br>Copyright ©2026 Stakes Casino.",
    frca: "Les jeux d'argent peuvent créer une dépendance. Veuillez jouer de manière responsable. Pour obtenir de l'aide, consultez notre page Jeu Responsable. Les jeux d'argent pour les mineurs constituent une infraction. 18+<br><br>Copyright ©2026 Stakes Casino.",
    de:   'Glücksspiel kann süchtig machen. Bitte spielen Sie verantwortungsbewusst. Hilfe finden Sie auf unserer Seite Verantwortungsvolles Spielen. Glücksspiel durch Minderjährige ist strafbar. 18+<br><br>Copyright ©2026 Stakes Casino.',
    it:   "Il gioco d'azzardo può creare dipendenza. Si prega di giocare responsabilmente. Per assistenza visita la nostra pagina Gioco Responsabile. Il gioco d'azzardo da parte di minorenni è un reato. 18+<br><br>Copyright ©2026 Stakes Casino.",
    es:   'El juego puede crear adicción. Por favor, juega de forma responsable. Para obtener ayuda visita nuestra página de Juego Responsable. El juego de menores es un delito. 18+<br><br>Copyright ©2026 Stakes Casino.',
  }

  const stakesCasinoFooterLegalByLang = {
    en: 'Gambling can be addictive, please Play Responsibly. For help visit our Responsible Gambling page. Underage gambling is an offence. 18+<br><br>Copyright ©2026 Stakes Casino.',
  }

  const x7FooterLegalByLang = {
    en: 'This website is licensed under Starscream Limited, a company incorporated under the laws of Saint Lucia with registration number 2023-00007. Licensed and regulated under Client Provider Authorization No. 00952 issued July 2023 by the Kahnawake Gaming Commission.<br><br>Gambling can be addictive, please Play Responsibly. For help visit our Responsible Gambling page. Underage gambling is an offence. 18+<br><br>©2026 X7Casino, All Rights Reserved.',
    fr:  "Ce site est exploité par Starscream Limited, société immatriculée à Saint-Lucie sous le n° 2023-00007. Licenciée et réglementée en vertu de l'Autorisation n° 00952 délivrée en juillet 2023 par la Commission des jeux de Kahnawake.<br><br>Les jeux d'argent peuvent créer une dépendance. Veuillez jouer de manière responsable. Pour obtenir de l'aide, consultez notre page Jeu Responsable. Les jeux d'argent pour les mineurs constituent une infraction. 18+<br><br>©2026 X7Casino, Tous droits réservés.",
    de:  'Diese Website wird von Starscream Limited betrieben, einem in Saint Lucia eingetragenen Unternehmen (Nr. 2023-00007). Lizenziert und reguliert gemäß der Client Provider Authorization Nr. 00952, ausgestellt im Juli 2023 von der Kahnawake Gaming Commission.<br><br>Glücksspiel kann süchtig machen. Bitte spielen Sie verantwortungsbewusst. Hilfe finden Sie auf unserer Seite Verantwortungsvolles Spielen. Glücksspiel durch Minderjährige ist strafbar. 18+<br><br>©2026 X7Casino, Alle Rechte vorbehalten.',
    it:  "Questo sito è gestito da Starscream Limited, società costituita ai sensi delle leggi di Saint Lucia con numero di registrazione 2023-00007. Autorizzata e regolamentata in virtù dell'Autorizzazione n. 00952 rilasciata nel luglio 2023 dalla Kahnawake Gaming Commission.<br><br>Il gioco d'azzardo può creare dipendenza. Si prega di giocare responsabilmente. Per assistenza visita la nostra pagina Gioco Responsabile. Il gioco d'azzardo da parte di minorenni è un reato. 18+<br><br>©2026 X7Casino, Tutti i diritti riservati.",
    es:  'Este sitio está operado por Starscream Limited, empresa constituida bajo las leyes de Santa Lucía con número de registro 2023-00007. Licenciada y regulada en virtud de la Autorización n.° 00952 emitida en julio de 2023 por la Kahnawake Gaming Commission.<br><br>El juego puede crear adicción. Por favor, juega de forma responsable. Para obtener ayuda visita nuestra página de Juego Responsable. El juego de menores es un delito. 18+<br><br>©2026 X7Casino, Todos los derechos reservados.',
  }

  // ── Stakes — Template ──────────────────────────────────────────────────────
  const stakesJCEditableFields = [
    // Header
    {
      key: 'LOGO_LINK', label: 'Logo Link', type: 'url', group: 'Header',
      defaultValues: stakesDomains,
    },
    {
      key: 'BANNER_IMG', label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true,
      placeholder: 'https://scdn.ntgm.rocks/...',
      defaultValues: {
        en:   'https://scdn.ntgm.rocks/image/stakes/auto/auto/200nofsWELCOME%20BONUS%20-%20EN.png',
        fr:   'https://scdn.ntgm.rocks/image/stakes/auto/auto/200nofsWELCOME%20BONUS%20-%20FR.png',
        frca: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/200nofsWELCOME%20BONUS%20-%20FR.png',
        de:   'https://scdn.ntgm.rocks/image/stakes/auto/auto/200nofsWELCOME%20BONUS%20-%20DE.png',
        it:   'https://scdn.ntgm.rocks/image/stakes/auto/auto/200nofsWELCOME%20BONUS%20-%20IT.png',
        es:   'https://scdn.ntgm.rocks/image/stakes/auto/auto/200nofsWELCOME%20BONUS%20-%20ES.png',
      },
    },
    {
      key: 'BANNER_LINK', label: 'Banner Link', type: 'url', group: 'Header',
      defaultValues: stakesDomains,
    },

    // Body
    {
      key: 'GREETING', label: 'Greeting', type: 'text', group: 'Body',
      defaultValues: { en: 'Hello', fr: 'Salut', frca: 'Salut', de: 'Hallo', it: 'Ciao', es: 'Hola' },
    },
    {
      key: 'BODY_CONTENT', label: 'Body Content', type: 'paragraphs', group: 'Body', defaultRequired: true,
      defaultParagraphsByLang: {
        en: [
          { id: 'p1', html: 'Hero, you made it. Welcome at <strong style="font-weight:700">Stakes</strong>.' },
          { id: 'p2', html: 'Make your first deposit of <strong style="font-weight:700">&euro;10 or more</strong> and unlock your <strong style="font-weight:700">200% Welcome Bonus up to &euro;500.</strong>' },
          { id: 'p3', html: 'Your <strong style="font-weight:700">Stakes</strong> adventure starts now. Play like a hero.' },
        ],
        fr: [
          { id: 'p1', html: 'H&eacute;ros, tu as r&eacute;ussi. Bienvenue chez <strong style="font-weight:700">Stakes</strong>.' },
          { id: 'p2', html: 'Fais ton premier d&eacute;p&ocirc;t de <strong style="font-weight:700">10 &euro; ou plus</strong> et d&eacute;bloque ton <strong style="font-weight:700">bonus de bienvenue de 200&nbsp;% jusqu&rsquo;&agrave; 500&nbsp;&euro;</strong>.' },
          { id: 'p3', html: 'Ton aventure chez <strong style="font-weight:700">Stakes</strong> commence maintenant. Joue comme un h&eacute;ros.' },
        ],
        frca: [
          { id: 'p1', html: 'H&eacute;ros, tu as r&eacute;ussi. Bienvenue chez <strong style="font-weight:700">Stakes</strong>.' },
          { id: 'p2', html: 'Fais ton premier d&eacute;p&ocirc;t de <strong style="font-weight:700">10 &euro; ou plus</strong> et d&eacute;bloque ton <strong style="font-weight:700">bonus de bienvenue de 200&nbsp;% jusqu&rsquo;&agrave; 500&nbsp;&euro;</strong>.' },
          { id: 'p3', html: 'Ton aventure chez <strong style="font-weight:700">Stakes</strong> commence maintenant. Joue comme un h&eacute;ros.' },
        ],
        de: [
          { id: 'p1', html: 'Du hast es geschafft, unser Held. Willkommen bei <strong style="font-weight:700">Stakes</strong>.' },
          { id: 'p2', html: 'T&auml;tige deine erste Einzahlung von <strong style="font-weight:700">mindestens 10&nbsp;&euro;</strong> und sichere dir deinen <strong style="font-weight:700">200&nbsp;% Willkommensbonus von bis zu 500&nbsp;&euro;</strong>.' },
          { id: 'p3', html: 'Dein <strong style="font-weight:700">Stakes</strong> Abenteuer beginnt jetzt. Spiel wie ein Held.' },
        ],
        it: [
          { id: 'p1', html: 'Eroe, ce l&rsquo;hai fatta. Benvenuto su <strong style="font-weight:700">Stakes</strong>.' },
          { id: 'p2', html: 'Effettua il tuo primo deposito di <strong style="font-weight:700">almeno 10&nbsp;&euro;</strong> e sblocca il tuo <strong style="font-weight:700">Bonus di Benvenuto del 200% fino a 500&nbsp;&euro;</strong>.' },
          { id: 'p3', html: 'La tua avventura su <strong style="font-weight:700">Stakes</strong> inizia ora. Gioca come un eroe!' },
        ],
        es: [
          { id: 'p1', html: 'H&eacute;roe, lo lograste. Bienvenido a <strong style="font-weight:700">Stakes</strong>.' },
          { id: 'p2', html: 'Haz tu primer dep&oacute;sito de <strong style="font-weight:700">&euro;10 o m&aacute;s</strong> y desbloquea tu <strong style="font-weight:700">Bono de Bienvenida del 200% hasta &euro;500</strong>.' },
          { id: 'p3', html: 'Tu aventura en <strong style="font-weight:700">Stakes</strong> comienza ahora. Juega como un h&eacute;roe.' },
        ],
      },
    },
    {
      key: 'CTA_TEXT', label: 'CTA Button Text', type: 'text', group: 'Body',
      defaultValues: {
        en: 'DEPOSIT NOW', fr: 'DÉPOSER MAINTENANT', frca: 'DÉPOSER MAINTENANT',
        de: 'JETZT EINZAHLEN', it: 'DEPOSITA ORA', es: 'DEPOSITAR AHORA',
      },
    },
    { key: 'CTA_LINK', label: 'CTA Button Link', type: 'url', group: 'Body', defaultValues: stakesDomains },

    // Username & Password
    {
      key: 'USERNAME_LABEL', label: 'Username Label', type: 'text', group: 'Username & Password',
      defaultValues: {
        en: 'Username', fr: "Nom d'utilisateur", frca: "Nom d'utilisateur",
        de: 'Benutzername', it: 'Nome utente', es: 'Nombre de usuario',
      },
    },
    {
      key: 'FORGOT_LABEL', label: 'Forgot Password Label', type: 'text', group: 'Username & Password',
      defaultValues: {
        en: 'Forgot your password?', fr: 'Mot de passe oublié ?', frca: 'Mot de passe oublié ?',
        de: 'Passwort vergessen?', it: 'Password dimenticata?', es: '¿Olvidaste tu contraseña?',
      },
    },
    {
      key: 'FORGOT_CTA', label: 'Forgot Password CTA', type: 'text', group: 'Username & Password',
      defaultValues: {
        en: 'Click here', fr: 'Cliquez ici', frca: 'Cliquez ici',
        de: 'Hier klicken', it: 'Clicca qui', es: 'Haz clic aquí',
      },
    },
    { key: 'FORGOT_LINK', label: 'Forgot Password Link', type: 'url', group: 'Username & Password', defaultValues: stakesDomains },

    // Thumbnails
    {
      key: 'THUMB1_IMG', label: 'Thumbnail 1 Image', type: 'url', group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-1_e52fd3ba-3.webp',
    },
    {
      key: 'THUMB1_LINK', label: 'Thumbnail 1 Link', type: 'url', group: 'Thumbnails',
      defaultValues: {
        en: 'https://www.stakes.com/promotions', fr: 'https://www.stakes3.com/promotions',
        frca: 'https://www.stakes.com/promotions', de: 'https://www.stakes.com/promotions',
        it: 'https://www.stakes3.com/promotions', es: 'https://www.stakes.com/promotions',
      },
    },
    {
      key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails',
      defaultValues: {
        en: 'Exclusive Bonuses', fr: 'Bonus exclusifs', frca: 'Bonus exclusifs',
        de: 'Exklusive Boni', it: 'Bonus esclusivi', es: 'Bonos exclusivos',
      },
    },
    {
      key: 'THUMB2_IMG', label: 'Thumbnail 2 Image', type: 'url', group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-2_4e62aa56-4.webp',
    },
    {
      key: 'THUMB2_LINK', label: 'Thumbnail 2 Link', type: 'url', group: 'Thumbnails',
      defaultValues: {
        en: 'https://www.stakes.com/promotions', fr: 'https://www.stakes3.com/promotions',
        frca: 'https://www.stakes.com/promotions', de: 'https://www.stakes.com/promotions',
        it: 'https://www.stakes3.com/promotions', es: 'https://www.stakes.com/promotions',
      },
    },
    {
      key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails',
      defaultValues: {
        en: '10000+ Games', fr: '10 000+ jeux', frca: '10 000+ jeux',
        de: '10.000+ Spiele', it: '10.000+ giochi', es: '10.000+ juegos',
      },
    },

    // Footer
    {
      key: 'TERMS_TEXT', label: 'Terms & Conditions', type: 'richtext', group: 'Footer',
      defaultValues: {
        en:   'Valid on first deposit only | Minimum deposit: €10 or equivalent | Get 200% up to €500 | Wagering: 40x | Standard Stakes terms apply',
        fr:   "Valable sur le premier dépôt uniquement | Dépôt minimum : 10 € ou équivalent | Obtenez 200 % jusqu'à 500 € | Mise : 40x | Conditions générales Stakes applicables",
        frca: "Valable sur le premier dépôt uniquement | Dépôt minimum : 10 $ ou équivalent | Obtenez 200 % jusqu'à 500 $ | Mise : 40x | Conditions générales Stakes applicables",
        de:   'Gilt nur für die erste Einzahlung | Mindesteinzahlung: 10 € oder äquivalent | Erhalte 200 % bis zu 500 € | Umsatzbedingung: 40x | Es gelten die Standard Stakes Bedingungen',
        it:   'Valido solo sul primo deposito | Deposito minimo: 10 € o equivalente | Ottieni il 200% fino a 500 € | Requisito di scommessa: 40x | Si applicano i termini e le condizioni standard di Stakes',
        es:   'Válido solo en el primer depósito | Depósito mínimo: 10 € o equivalente | Obtén el 200% hasta 500 € | Apuesta: 40x | Se aplican los términos estándar de Stakes',
      },
    },
    {
      key: 'FOOTER_LEGAL', label: 'Footer Legal Text', type: 'richtext', group: 'Footer',
      defaultValues: stakesFooterLegalByLang,
    },
  ]

  const stakesJCLockedFields = [
    { key: 'FOOTER_LOGO1_LINK', label: '18+ Logo Link',     value: 'https://stakes.com/responsible-gaming', note: 'Responsible gaming 18+ logo href',  isReadOnly: false },
    { key: 'FOOTER_LOGO2_LINK', label: 'GamCare Logo Link', value: 'https://www.gamcare.org.uk',           note: 'GamCare responsible gaming logo href', isReadOnly: false },
  ]

  const stakesJC = await prisma.masterTemplate.upsert({
    where: { slug: 'stakes-template' },
    update: {
      baseFilePath: `${templateBaseDir}/master-templates/stakes`,
      editableFields: stakesJCEditableFields,
      lockedFields: stakesJCLockedFields,
      languages: ['en', 'fr', 'frca', 'de', 'it', 'es'],
    },
    create: {
      name: 'Stakes Template',
      slug: 'stakes-template',
      brand: 'STAKES',
      description: 'Stakes promotional email template — 6 languages (EN, FR, FRCA, DE, IT, ES)',
      baseFilePath: `${templateBaseDir}/master-templates/stakes`,
      isActive: true,
      editableFields: stakesJCEditableFields,
      lockedFields: stakesJCLockedFields,
      languages: ['en', 'fr', 'frca', 'de', 'it', 'es'],
    },
  })
  console.log(`✓ Stakes Template: ${stakesJC.id}`)

  // ── Stakes Casino — Template ───────────────────────────────────────────────
  const scDomains = { en: 'https://stakescasino.com/' }

  const stakesCasinoJCEditableFields = [
    // Header
    { key: 'LOGO_LINK', label: 'Logo Link', type: 'url', group: 'Header', defaultValues: scDomains },
    {
      key: 'BANNER_IMG', label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true,
      placeholder: 'https://scdn.ntgm.rocks/...',
      defaultValues: { en: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/REMINDER%20OF%20WB%2010FS2%20-%20EN.png' },
    },
    { key: 'BANNER_LINK', label: 'Banner Link', type: 'url', group: 'Header', defaultValues: { en: 'https://stakescasino.com/cashier/deposit' } },

    // Body
    { key: 'GREETING', label: 'Greeting', type: 'text', group: 'Body', defaultValues: { en: 'Hello' } },
    {
      key: 'BODY_CONTENT', label: 'Body Content', type: 'paragraphs', group: 'Body', defaultRequired: true,
      defaultParagraphsByLang: {
        en: [
          { id: 'p1', html: 'Your start at Stakes Casino is not over yet.' },
          { id: 'p2', html: 'Make your first <strong style="font-weight:700">deposit of &euro;10</strong> and unlock your <strong style="font-weight:700">200% Welcome Bonus up to &euro;500</strong>, plus <strong style="font-weight:700">100 spins on Vikings Go Berzerk</strong>.' },
          { id: 'p3', html: 'And as an extra boost, enjoy an additional <strong style="font-weight:700">10 Spins</strong> on top, just to get you going.' },
          { id: 'p4', html: 'It is the perfect way to kick off your journey, with extra balance, extra spins, and more chances to enjoy the action from the start.' },
          { id: 'p5', html: 'If you have been waiting for the right moment, this is it.' },
        ],
      },
    },
    { key: 'CTA_TEXT', label: 'CTA Button Text', type: 'text', group: 'Body', defaultValues: { en: 'DEPOSIT TO SPIN' } },
    { key: 'CTA_LINK', label: 'CTA Button Link', type: 'url', group: 'Body', defaultValues: { en: 'https://stakescasino.com/cashier/deposit' } },

    // Username & Password
    { key: 'USERNAME_LABEL', label: 'Username Label',        type: 'text', group: 'Username & Password', defaultValues: { en: 'Username' } },
    { key: 'FORGOT_LABEL',   label: 'Forgot Password Label', type: 'text', group: 'Username & Password', defaultValues: { en: 'Forgot your password?' } },
    { key: 'FORGOT_CTA',     label: 'Forgot Password CTA',   type: 'text', group: 'Username & Password', defaultValues: { en: 'Click here' } },
    { key: 'FORGOT_LINK',    label: 'Forgot Password Link',  type: 'url',  group: 'Username & Password', defaultValues: { en: 'https://stakescasino.com/password-recovery' } },

    // Thumbnails
    { key: 'THUMB1_IMG',   label: 'Thumbnail 1 Image', type: 'url',  group: 'Thumbnails', defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-1_e52fd3ba-3.webp' },
    { key: 'THUMB1_LINK',  label: 'Thumbnail 1 Link',  type: 'url',  group: 'Thumbnails', defaultValues: { en: 'https://www.stakescasino.com/promotions' } },
    { key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails', defaultValues: { en: 'Exclusive Bonuses' } },
    { key: 'THUMB2_IMG',   label: 'Thumbnail 2 Image', type: 'url',  group: 'Thumbnails', defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-2_4e62aa56-4.webp' },
    { key: 'THUMB2_LINK',  label: 'Thumbnail 2 Link',  type: 'url',  group: 'Thumbnails', defaultValues: { en: 'https://www.stakescasino.com/promotions' } },
    { key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails', defaultValues: { en: '10000+ Games' } },

    // Footer
    {
      key: 'TERMS_TEXT', label: 'Terms & Conditions', type: 'richtext', group: 'Footer',
      defaultValues: { en: 'Valid on first deposit only | Minimum deposit: €10 or equivalent | Get 200% up to €500 + 100 Spins | Wagering: 40x bonus | Standard Stakes Casino terms apply' },
    },
    {
      key: 'FOOTER_LEGAL', label: 'Footer Legal Text', type: 'richtext', group: 'Footer',
      defaultValues: stakesCasinoFooterLegalByLang,
    },
  ]

  const stakesCasinoJCLockedFields = [
    { key: 'FOOTER_LOGO1_LINK', label: '18+ Logo Link',     value: 'https://stakescasino.com/responsible-gaming', note: 'Responsible gaming 18+ logo href',  isReadOnly: false },
    { key: 'FOOTER_LOGO2_LINK', label: 'GamCare Logo Link', value: 'https://www.gamcare.org.uk',                  note: 'GamCare responsible gaming logo href', isReadOnly: false },
  ]

  const stakesCasinoJC = await prisma.masterTemplate.upsert({
    where: { slug: 'stakes-casino-template' },
    update: {
      baseFilePath: `${templateBaseDir}/master-templates/stakes-casino`,
      editableFields: stakesCasinoJCEditableFields,
      lockedFields: stakesCasinoJCLockedFields,
      languages: ['en'],
    },
    create: {
      name: 'Stakes Casino Template',
      slug: 'stakes-casino-template',
      brand: 'STAKES_CASINO',
      description: 'Stakes Casino promotional email template — English only',
      baseFilePath: `${templateBaseDir}/master-templates/stakes-casino`,
      isActive: true,
      editableFields: stakesCasinoJCEditableFields,
      lockedFields: stakesCasinoJCLockedFields,
      languages: ['en'],
    },
  })
  console.log(`✓ Stakes Casino Template: ${stakesCasinoJC.id}`)

  // ── X7 Casino — Template ───────────────────────────────────────────────────
  const x7JCEditableFields = [
    // Header
    { key: 'LOGO_LINK', label: 'Logo Link', type: 'url', group: 'Header', defaultValues: x7Domains },
    {
      key: 'BANNER_IMG', label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true,
      placeholder: 'https://scdn.ntgm.rocks/...',
      defaultValues: {
        en: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/Jackpot%20Club%20-%20EN.png',
        fr: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/Jackpot%20Club%20-%20FR.png',
        de: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/Jackpot%20Club%20-%20DE.png',
        it: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/Jackpot%20Club%20-%20IT.png',
        es: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/Jackpot%20Club%20-%20ES.png',
      },
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
      defaultValues: { en: 'Hello', fr: 'Salut', de: 'Hallo', it: 'Ciao', es: 'Hola' },
    },
    {
      key: 'BODY_CONTENT', label: 'Body Content', type: 'paragraphs', group: 'Body', defaultRequired: true,
      defaultParagraphsByLang: {
        en: [
          { id: 'p1', html: 'As you navigate the X7 grid, here\'s one feature you won\'t want to miss.' },
          { id: 'p2', html: '<strong style="font-weight:700">The Jackpot Club</strong> unlocks 4 progressive tiers: <strong style="font-weight:700">Mini</strong>, <strong style="font-weight:700">Minor</strong>, <strong style="font-weight:700">Major</strong>, and <strong style="font-weight:700">Royale</strong> with rewards climbing <strong style="font-weight:700">up to &euro;25,000</strong>.' },
          { id: 'p3', html: 'Spot <strong style="font-weight:700">The Jackpot Club</strong> <strong style="font-weight:700">interface</strong> before a game? That means it\'s live. <strong style="font-weight:700">Opt in</strong>, select your <strong style="font-weight:700">contribution percentage</strong>, and continue your <strong style="font-weight:700">gameplay</strong> as usual.' },
          { id: 'p4', html: 'Sharing the Jackpot starts from just <strong style="font-weight:700">&euro;0.10</strong> in bets. The higher your contribution, the stronger your chances to trigger a Jackpot. Each contribution runs as a separate side bet per round, completely independent from your base <strong style="font-weight:700">gameplay</strong>.' },
          { id: 'p5', html: 'Every opt-in, every spin, every moment in the grid brings you closer to the top!' },
        ],
        fr: [
          { id: 'p1', html: 'En explorant la grille X7, voici une fonctionnalité à ne pas manquer.' },
          { id: 'p2', html: '<strong style="font-weight:700">Le Jackpot Club</strong> propose 4 niveaux progressifs : <strong style="font-weight:700">Mini</strong>, <strong style="font-weight:700">Minor</strong>, <strong style="font-weight:700">Major</strong> et <strong style="font-weight:700">Royale</strong>, avec des récompenses pouvant atteindre <strong style="font-weight:700">jusqu\'à 25 000 &euro;</strong>.' },
          { id: 'p3', html: 'Vous repérez <strong style="font-weight:700">l\'interface</strong> du <strong style="font-weight:700">Jackpot Club</strong> avant un jeu ? Cela signifie qu\'il est actif. <strong style="font-weight:700">Activez-le</strong>, choisissez votre <strong style="font-weight:700">pourcentage de contribution</strong> et continuez à <strong style="font-weight:700">jouer</strong> normalement.' },
        ],
        de: [
          { id: 'p1', html: 'Beim Navigieren durch das X7 Spielfeld solltest du dir diese Funktion nicht entgehen lassen:' },
          { id: 'p2', html: '<strong style="font-weight:700">Der Jackpot Club</strong> schaltet vier progressive Stufen frei: <strong style="font-weight:700">Mini</strong>, <strong style="font-weight:700">Minor</strong>, <strong style="font-weight:700">Major</strong> und <strong style="font-weight:700">Royale</strong>. Die Gewinne können <strong style="font-weight:700">bis zu 25.000 &euro;</strong> betragen.' },
          { id: 'p3', html: 'Siehst du die Jackpot-Club <strong style="font-weight:700">Benutzeroberfläche</strong> vor einem Spiel? Dann ist der Club aktiv. <strong style="font-weight:700">Melde dich an</strong>, wähle deinen <strong style="font-weight:700">Beitragsprozentsatz</strong> und <strong style="font-weight:700">spiele</strong> wie gewohnt weiter.' },
        ],
        it: [
          { id: 'p1', html: 'Mentre esplori il campo di gioco di X7, ecco una funzionalità che non vorrai perderti.' },
          { id: 'p2', html: '<strong style="font-weight:700">Il Jackpot Club</strong> sblocca 4 livelli progressivi: <strong style="font-weight:700">Mini</strong>, <strong style="font-weight:700">Minor</strong>, <strong style="font-weight:700">Major</strong> e <strong style="font-weight:700">Royale</strong>, con premi che arrivano <strong style="font-weight:700">fino a 25.000 &euro;</strong>.' },
          { id: 'p3', html: 'Vedi <strong style="font-weight:700">l\'interfaccia</strong> del <strong style="font-weight:700">Jackpot Club</strong> prima di iniziare una partita? Significa che è attivo. <strong style="font-weight:700">Iscriviti</strong>, seleziona la tua <strong style="font-weight:700">percentuale di contributo</strong> e continua a <strong style="font-weight:700">giocare</strong> come al solito.' },
        ],
        es: [
          { id: 'p1', html: 'Mientras navegas por la red X7, hay una función que no querrás perderte.' },
          { id: 'p2', html: '<strong style="font-weight:700">El Jackpot Club</strong> desbloquea 4 niveles progresivos: <strong style="font-weight:700">Mini</strong>, <strong style="font-weight:700">Minor</strong>, <strong style="font-weight:700">Major</strong> y <strong style="font-weight:700">Royale</strong> con recompensas que alcanzan <strong style="font-weight:700">hasta &euro;25,000</strong>.' },
          { id: 'p3', html: '¿Ves la <strong style="font-weight:700">interfaz</strong> del <strong style="font-weight:700">Jackpot Club</strong> antes de un juego? Eso significa que está activo. <strong style="font-weight:700">Actívalo</strong>, selecciona tu <strong style="font-weight:700">porcentaje de contribución</strong> y continúa <strong style="font-weight:700">jugando</strong> como de costumbre.' },
        ],
      },
    },
    {
      key: 'CTA_TEXT', label: 'CTA Button Text', type: 'text', group: 'Body',
      defaultValues: {
        en: 'OPT-IN NOW!', fr: 'OPT-IN MAINTENANT !',
        de: 'JETZT EINSCHREIBEN!', it: 'ISCRIVITI ORA!', es: '¡ÚNETE AHORA!',
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
        en: 'Username', fr: "Nom d'utilisateur",
        de: 'Benutzername', it: 'Nome utente', es: 'Nombre de usuario',
      },
    },
    {
      key: 'FORGOT_LABEL', label: 'Forgot Password Label', type: 'text', group: 'Username & Password',
      defaultValues: {
        en: 'Forgot your password?', fr: 'Mot de passe oublié ?',
        de: 'Passwort vergessen?', it: 'Password dimenticata?', es: '¿Olvidaste tu contraseña?',
      },
    },
    {
      key: 'FORGOT_CTA', label: 'Forgot Password CTA', type: 'text', group: 'Username & Password',
      defaultValues: {
        en: 'Click here', fr: 'Cliquez ici',
        de: 'Hier klicken', it: 'Clicca qui', es: 'Haz clic aquí',
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
    { key: 'THUMB1_IMG',   label: 'Thumbnail 1 Image', type: 'url',  group: 'Thumbnails', defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/Thumbnail_1_1452023b-7.webp' },
    {
      key: 'THUMB1_LINK', label: 'Thumbnail 1 Link', type: 'url', group: 'Thumbnails',
      defaultValues: {
        en: 'https://x7casino.com/en/promotions', fr: 'https://x7casino.com/fr/promotions',
        de: 'https://x7casino2.com/de/promotions', it: 'https://x7casino.com/it/promotions',
        es: 'https://x7casino.com/es/promotions',
      },
    },
    {
      key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails',
      defaultValues: {
        en: 'Exclusive Bonuses', fr: 'Bonus exclusifs',
        de: 'Exklusive Boni', it: 'Bonus esclusivi', es: 'Bonos exclusivos',
      },
    },
    { key: 'THUMB2_IMG',   label: 'Thumbnail 2 Image', type: 'url',  group: 'Thumbnails', defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/Thumbnail_2_9b47b69c-0.webp' },
    {
      key: 'THUMB2_LINK', label: 'Thumbnail 2 Link', type: 'url', group: 'Thumbnails',
      defaultValues: {
        en: 'https://x7casino.com/en/promotions', fr: 'https://x7casino.com/fr/promotions',
        de: 'https://x7casino2.com/de/promotions', it: 'https://x7casino.com/it/promotions',
        es: 'https://x7casino.com/es/promotions',
      },
    },
    {
      key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails',
      defaultValues: {
        en: '10000+ Games', fr: '10 000+ jeux',
        de: '10.000+ Spiele', it: '10.000+ giochi', es: '10.000+ juegos',
      },
    },

    // Footer
    {
      key: 'TERMS_TEXT', label: 'Terms & Conditions', type: 'richtext', group: 'Footer',
      defaultValues: {
        en: 'Jackpot available to opted-in players only | Opt-in required and remains active until manually disabled | 4 Jackpot tiers: Mini, Minor, Major, Royale | Available on selected Slot & Live Casino games | Jackpot bet is an additional cost per round and independent of base game results | Contribution levels may apply where available | Players can opt-out anytime | Full terms available within participating games',
        fr: "Jackpot réservé aux joueurs ayant activé l'option | Activation requise, reste active jusqu'à désactivation manuelle | 4 niveaux : Mini, Minor, Major, Royale | Disponible sur certains jeux de machines à sous et casino en direct | Mise jackpot = coût supplémentaire par tour, indépendant du jeu de base | Niveaux de contribution selon les jeux | Désinscription possible à tout moment | Conditions complètes disponibles dans les jeux participants",
        de: 'Jackpot nur für angemeldete Spieler | Anmeldung erforderlich, bleibt aktiv bis zur manuellen Deaktivierung | 4 Stufen: Mini, Minor, Major, Royale | Verfügbar bei ausgewählten Slot- und Live-Casino-Spielen | Jackpot-Einsatz ist ein zusätzlicher Betrag pro Runde, unabhängig vom Basisspiel | Beitragsstufen können gelten | Abmeldung jederzeit möglich | Vollständige Bedingungen in den teilnehmenden Spielen',
        it: "Jackpot disponibile solo per i giocatori che hanno aderito | Adesione richiesta, rimane attiva fino a disattivazione manuale | 4 livelli: Mini, Minor, Major, Royale | Disponibile su giochi Slot e Live Casino selezionati | La scommessa jackpot è un costo aggiuntivo per round, indipendente dal gioco base | Livelli di contribuzione applicabili | Recesso possibile in qualsiasi momento | Condizioni complete disponibili nei giochi partecipanti",
        es: "Jackpot disponible solo para jugadores que hayan optado | Activación obligatoria, permanece activa hasta desactivación manual | 4 niveles: Mini, Minor, Major, Royale | Disponible en juegos de Slot y Casino en Vivo seleccionados | La apuesta del jackpot es un coste adicional por ronda, independiente del juego base | Niveles de contribución aplicables | Cancelación posible en cualquier momento | Condiciones completas disponibles en los juegos participantes",
      },
    },
    {
      key: 'FOOTER_LEGAL', label: 'Footer Legal Text', type: 'richtext', group: 'Footer',
      defaultValues: x7FooterLegalByLang,
    },
  ]

  const x7JCLockedFields = [
    { key: 'FOOTER_LOGO1_LINK', label: 'Play Responsibly Logo Link', value: 'https://gamingcommission.ca/interactive-gaming/players/#plLE', note: 'Play Responsibly logo href',           isReadOnly: false },
    { key: 'FOOTER_LOGO2_LINK', label: '18+ Logo Link',              value: 'https://x7casino.com/en/responsible-gaming',                 note: 'Responsible gaming 18+ logo href',     isReadOnly: false },
    { key: 'FOOTER_LOGO3_LINK', label: 'Kahnawake Logo Link',        value: 'https://gamingcommission.ca/interactive-gaming/players/#plLE', note: 'Kahnawake Gaming Commission logo href', isReadOnly: false },
  ]

  const x7JC = await prisma.masterTemplate.upsert({
    where: { slug: 'x7-casino-template' },
    update: {
      baseFilePath: `${templateBaseDir}/master-templates/x7`,
      editableFields: x7JCEditableFields,
      lockedFields: x7JCLockedFields,
      languages: ['en', 'fr', 'de', 'it', 'es'],
    },
    create: {
      name: 'X7 Casino Template',
      slug: 'x7-casino-template',
      brand: 'X7',
      description: 'X7 Casino promotional email template — 5 languages (EN, FR, DE, IT, ES)',
      baseFilePath: `${templateBaseDir}/master-templates/x7`,
      isActive: true,
      editableFields: x7JCEditableFields,
      lockedFields: x7JCLockedFields,
      languages: ['en', 'fr', 'de', 'it', 'es'],
    },
  })
  console.log(`✓ X7 Casino Template: ${x7JC.id}`)

  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
