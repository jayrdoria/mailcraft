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

  // ── Stakes — Jackpot Club ──────────────────────────────────────────────────
  const stakesJCEditableFields = [
    // Header
    { key: 'LOGO_LINK',   label: 'Logo Link',   type: 'url', group: 'Header', defaultValues: stakesDomains },
    { key: 'BANNER_IMG',  label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true, placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'BANNER_LINK', label: 'Banner Link',  type: 'url', group: 'Header', defaultValues: stakesDomains },

    // Body
    {
      key: 'GREETING', label: 'Greeting', type: 'text', group: 'Body',
      defaultValues: { en: 'Hello', fr: 'Salut', frca: 'Salut', de: 'Hallo', it: 'Ciao', es: 'Hola' },
    },
    {
      key: 'BODY_CONTENT', label: 'Body Content', type: 'paragraphs', group: 'Body', defaultRequired: true,
      defaultParagraphs: [{ id: 'p1', html: '' }],
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
    { key: 'THUMB1_IMG',   label: 'Thumbnail 1 Image', type: 'url',  group: 'Thumbnails', placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'THUMB1_LINK',  label: 'Thumbnail 1 Link',  type: 'url',  group: 'Thumbnails', defaultValues: stakesDomains },
    { key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails' },
    { key: 'THUMB2_IMG',   label: 'Thumbnail 2 Image', type: 'url',  group: 'Thumbnails', placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'THUMB2_LINK',  label: 'Thumbnail 2 Link',  type: 'url',  group: 'Thumbnails', defaultValues: stakesDomains },
    { key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails' },

    // Footer
    { key: 'TERMS_TEXT',   label: 'Terms & Conditions', type: 'richtext', group: 'Footer' },
    { key: 'FOOTER_LEGAL', label: 'Footer Legal Text',  type: 'richtext', group: 'Footer' },
  ]

  const stakesJCLockedFields = [
    { key: 'FOOTER_LOGO1_LINK', label: '18+ Logo Link',     value: '#',                         note: 'Responsible gaming 18+ logo href',  isReadOnly: false },
    { key: 'FOOTER_LOGO2_LINK', label: 'GamCare Logo Link', value: 'https://www.gamcare.org.uk', note: 'GamCare responsible gaming logo href', isReadOnly: false },
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

  // ── Stakes Casino — Jackpot Club ───────────────────────────────────────────
  const scDomains = { en: 'https://stakescasino.com/' }

  const stakesCasinoJCEditableFields = [
    // Header
    { key: 'LOGO_LINK',   label: 'Logo Link',   type: 'url', group: 'Header', defaultValues: scDomains },
    { key: 'BANNER_IMG',  label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true, placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'BANNER_LINK', label: 'Banner Link',  type: 'url', group: 'Header', defaultValues: scDomains },

    // Body
    { key: 'GREETING',     label: 'Greeting',       type: 'text',       group: 'Body', defaultValues: { en: 'Hello' } },
    {
      key: 'BODY_CONTENT', label: 'Body Content',   type: 'paragraphs', group: 'Body', defaultRequired: true,
      defaultParagraphs: [{ id: 'p1', html: '' }],
    },
    { key: 'CTA_TEXT', label: 'CTA Button Text', type: 'text', group: 'Body', defaultValues: { en: 'DEPOSIT NOW' } },
    { key: 'CTA_LINK', label: 'CTA Button Link', type: 'url',  group: 'Body', defaultValues: scDomains },

    // Username & Password
    { key: 'USERNAME_LABEL', label: 'Username Label',         type: 'text', group: 'Username & Password', defaultValues: { en: 'Username' } },
    { key: 'FORGOT_LABEL',   label: 'Forgot Password Label',  type: 'text', group: 'Username & Password', defaultValues: { en: 'Forgot your password?' } },
    { key: 'FORGOT_CTA',     label: 'Forgot Password CTA',    type: 'text', group: 'Username & Password', defaultValues: { en: 'Click here' } },
    { key: 'FORGOT_LINK',    label: 'Forgot Password Link',   type: 'url',  group: 'Username & Password', defaultValues: scDomains },

    // Thumbnails
    { key: 'THUMB1_IMG',   label: 'Thumbnail 1 Image', type: 'url',  group: 'Thumbnails', placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'THUMB1_LINK',  label: 'Thumbnail 1 Link',  type: 'url',  group: 'Thumbnails', defaultValues: scDomains },
    { key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails' },
    { key: 'THUMB2_IMG',   label: 'Thumbnail 2 Image', type: 'url',  group: 'Thumbnails', placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'THUMB2_LINK',  label: 'Thumbnail 2 Link',  type: 'url',  group: 'Thumbnails', defaultValues: scDomains },
    { key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails' },

    // Footer
    { key: 'TERMS_TEXT',   label: 'Terms & Conditions', type: 'richtext', group: 'Footer' },
    { key: 'FOOTER_LEGAL', label: 'Footer Legal Text',  type: 'richtext', group: 'Footer' },
  ]

  const stakesCasinoJCLockedFields = [
    { key: 'FOOTER_LOGO1_LINK', label: '18+ Logo Link',     value: '#',                         note: 'Responsible gaming 18+ logo href',  isReadOnly: false },
    { key: 'FOOTER_LOGO2_LINK', label: 'GamCare Logo Link', value: 'https://www.gamcare.org.uk', note: 'GamCare responsible gaming logo href', isReadOnly: false },
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

  // ── X7 Casino — Jackpot Club ───────────────────────────────────────────────
  const x7JCEditableFields = [
    // Header
    { key: 'LOGO_LINK',   label: 'Logo Link',   type: 'url', group: 'Header', defaultValues: x7Domains },
    { key: 'BANNER_IMG',  label: 'Banner Image', type: 'url', group: 'Header', defaultRequired: true, placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'BANNER_LINK', label: 'Banner Link',  type: 'url', group: 'Header', defaultValues: x7Domains },

    // Body
    {
      key: 'GREETING', label: 'Greeting', type: 'text', group: 'Body',
      defaultValues: { en: 'Hello', fr: 'Salut', de: 'Hallo', it: 'Ciao', es: 'Hola' },
    },
    {
      key: 'BODY_CONTENT', label: 'Body Content', type: 'paragraphs', group: 'Body', defaultRequired: true,
      defaultParagraphs: [{ id: 'p1', html: '' }],
    },
    {
      key: 'CTA_TEXT', label: 'CTA Button Text', type: 'text', group: 'Body',
      defaultValues: {
        en: 'DEPOSIT NOW', fr: 'DÉPOSER MAINTENANT',
        de: 'JETZT EINZAHLEN', it: 'DEPOSITA ORA', es: 'DEPOSITAR AHORA',
      },
    },
    { key: 'CTA_LINK', label: 'CTA Button Link', type: 'url', group: 'Body', defaultValues: x7Domains },

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
    { key: 'FORGOT_LINK', label: 'Forgot Password Link', type: 'url', group: 'Username & Password', defaultValues: x7Domains },

    // Thumbnails
    { key: 'THUMB1_IMG',   label: 'Thumbnail 1 Image', type: 'url',  group: 'Thumbnails', placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'THUMB1_LINK',  label: 'Thumbnail 1 Link',  type: 'url',  group: 'Thumbnails', defaultValues: x7Domains },
    { key: 'THUMB1_LABEL', label: 'Thumbnail 1 Label', type: 'text', group: 'Thumbnails' },
    { key: 'THUMB2_IMG',   label: 'Thumbnail 2 Image', type: 'url',  group: 'Thumbnails', placeholder: 'https://scdn.ntgm.rocks/...' },
    { key: 'THUMB2_LINK',  label: 'Thumbnail 2 Link',  type: 'url',  group: 'Thumbnails', defaultValues: x7Domains },
    { key: 'THUMB2_LABEL', label: 'Thumbnail 2 Label', type: 'text', group: 'Thumbnails' },

    // Footer
    { key: 'TERMS_TEXT',   label: 'Terms & Conditions', type: 'richtext', group: 'Footer' },
    { key: 'FOOTER_LEGAL', label: 'Footer Legal Text',  type: 'richtext', group: 'Footer' },
  ]

  const x7JCLockedFields = [
    { key: 'FOOTER_LOGO1_LINK', label: 'Play Responsibly Logo Link', value: '#', note: 'Play Responsibly logo href',           isReadOnly: false },
    { key: 'FOOTER_LOGO2_LINK', label: '18+ Logo Link',              value: '#', note: 'Responsible gaming 18+ logo href',     isReadOnly: false },
    { key: 'FOOTER_LOGO3_LINK', label: 'Kahnawake Logo Link',        value: '#', note: 'Kahnawake Gaming Commission logo href', isReadOnly: false },
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
