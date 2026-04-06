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

  // ── Stakes — Email Verification ────────────────────────────────────────────
  const stakesEditableFields = [
    {
      key: 'BANNER_URL',
      label: 'Banner Image URL',
      type: 'url',
      defaultRequired: true,
      group: 'Header',
      placeholder: 'https://cdn.example.com/banner.png',
      defaultValues: {
        en: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/STAKES-MAILER-TEMPLATE-1-EN.png',
        fr: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/STAKES-MAILER-TEMPLATE-1-FR.png',
        de: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/STAKES-MAILER-TEMPLATE-1-DE.png',
        it: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/STAKES-MAILER-TEMPLATE-1-IT.png',
        es: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/STAKES-MAILER-TEMPLATE-1-ES.png',
      },
    },
    {
      key: 'TAGLINE',
      label: 'Tagline',
      type: 'text',
      defaultRequired: false,
      group: 'Body',
      defaultValues: {
        en: 'Your hero journey begins now.',
        fr: 'Ton aventure de héros commence maintenant.',
        de: 'Deine Heldenreise beginnt jetzt.',
        it: 'Il tuo viaggio da eroe inizia ora.',
        es: 'Tu viaje de héroe comienza ahora.',
      },
    },
    {
      key: 'BODY_COPY',
      label: 'Body Copy',
      type: 'richtext',
      defaultRequired: false,
      group: 'Body',
      defaultValues: {
        en: 'Verify your email to unlock your hero rewards!',
        fr: 'Vérifie ton e-mail pour débloquer tes récompenses de héros !',
        de: 'Bestätige deine E-Mail-Adresse, um deine Heldenbelohnungen freizuschalten!',
        it: 'Verifica la tua email per sbloccare i tuoi premi da eroe!',
        es: '¡Verifica tu correo electrónico para desbloquear tus recompensas de héroe!',
      },
    },
    {
      key: 'CTA_BUTTON_TEXT',
      label: 'Verify Button Text',
      type: 'text',
      defaultRequired: false,
      group: 'Body',
      defaultValues: {
        en: 'VERIFY NOW!',
        fr: 'VERIFIE MAINTENANT !',
        de: 'JETZT VERIFIZIEREN!',
        it: 'VERIFICA ORA!',
        es: '¡VERIFICA AHORA!',
      },
    },
    {
      key: 'THUMBNAIL_1_URL',
      label: 'Thumbnail 1 Image URL',
      type: 'url',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-1_e52fd3ba-3.webp',
    },
    {
      key: 'THUMBNAIL_1_LABEL',
      label: 'Thumbnail 1 Label',
      type: 'text',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValues: {
        en: 'Exclusive Bonuses',
        fr: 'Bonus exclusifs',
        de: 'Exklusive Boni',
        it: 'Bonus esclusivi',
        es: 'Bonos exclusivos',
      },
    },
    {
      key: 'THUMBNAIL_2_URL',
      label: 'Thumbnail 2 Image URL',
      type: 'url',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-2_4e62aa56-4.webp',
    },
    {
      key: 'THUMBNAIL_2_LABEL',
      label: 'Thumbnail 2 Label',
      type: 'text',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValues: {
        en: '10000+ Games',
        fr: '10000+ Jeux',
        de: '10000+ Spiele',
        it: '10000+ Giochi',
        es: '10000+ Juegos',
      },
    },
    {
      key: 'THUMBNAIL_3_URL',
      label: 'Thumbnail 3 Image URL',
      type: 'url',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/STAKES-EMAIL-THUMBNAIL_-3_ffec9e24-c.webp',
    },
    {
      key: 'THUMBNAIL_3_LABEL',
      label: 'Thumbnail 3 Label',
      type: 'text',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValues: {
        en: 'Instant Withdrawals',
        fr: 'Retraits instantanés',
        de: 'Sofortige Auszahlungen',
        it: 'Prelievi istantanei',
        es: 'Retiros instantáneos',
      },
    },
  ]

  const stakesLockedFields = [
    {
      key: 'STAKES_CASINO_LOGO_URL',
      label: 'Stakes Casino Logo URL',
      value: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/Stakes-Casino-Colored-S_3d6037f7-f.webp',
      note: 'Brand logo for stakescasino.com variant — update to apply globally',
      isReadOnly: false,
    },
    {
      key: 'STAKES_LOGO_URL',
      label: 'Stakes Logo URL',
      value: 'https://gallery.mailchimp.com/d9ac2f74431f1607601b4374c/images/0b1dabae-9c94-4f11-9b49-8161672d93f8.png',
      note: 'Brand logo for stakes.com variant — update to apply globally',
      isReadOnly: false,
    },
  ]

  const stakesEV = await prisma.masterTemplate.upsert({
    where: { slug: 'stakes-email-verification' },
    update: {
      baseFilePath: `${templateBaseDir}/master-templates/stakes/email-verification`,
      editableFields: stakesEditableFields,
      lockedFields: stakesLockedFields,
    },
    create: {
      name: 'Email Verification',
      slug: 'stakes-email-verification',
      brand: 'STAKES',
      description:
        'Stakes Casino & Stakes.com email verification — dual-domain CIO template. Contains *|IF:DOMAIN_URL=stakescasino.com|* conditional evaluated by Customer.io at send time.',
      baseFilePath: `${templateBaseDir}/master-templates/stakes/email-verification`,
      isActive: true,
      editableFields: stakesEditableFields,
      lockedFields: stakesLockedFields,
    },
  })
  console.log(`✓ Stakes Email Verification: ${stakesEV.id}`)

  // ── X7 — Email Verification ────────────────────────────────────────────────
  const x7EditableFields = [
    {
      key: 'BANNER_URL',
      label: 'Banner Image URL',
      type: 'url',
      defaultRequired: true,
      group: 'Header',
      placeholder: 'https://cdn.example.com/banner.png',
      defaultValues: {
        en: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/EN-%20Main.png',
        fr: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/FR-%20Main.png',
        de: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/DE-%20Main.png',
        it: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/IT%20-%20Main.png',
        es: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/ES-%20Main.png',
      },
    },
    {
      key: 'TAGLINE',
      label: 'Tagline',
      type: 'text',
      defaultRequired: false,
      group: 'Body',
      defaultValues: {
        en: 'Your elite journey begins now.',
        fr: "Votre parcours d'élite commence maintenant.",
        de: 'Deine Elite-Reise beginnt jetzt.',
        it: "Il tuo viaggio nell'élite inizia ora.",
        es: 'Tu viaje de élite comienza ahora.',
      },
    },
    {
      key: 'BODY_COPY',
      label: 'Body Copy',
      type: 'richtext',
      defaultRequired: false,
      group: 'Body',
      defaultValues: {
        en: 'Verify your email to unlock your elite rewards!',
        fr: "Vérifiez votre e-mail pour débloquer vos récompenses d'élite !",
        de: 'Bestätige deine E-Mail-Adresse, um deine Elite-Prämien freizuschalten!',
        it: 'Verifica la tua email per sbloccare i tuoi premi esclusivi!',
        es: '¡Verifica tu correo electrónico para desbloquear tus recompensas de élite!',
      },
    },
    {
      key: 'CTA_BUTTON_TEXT',
      label: 'Verify Button Text',
      type: 'text',
      defaultRequired: false,
      group: 'Body',
      defaultValues: {
        en: 'VERIFY NOW!',
        fr: 'VERIFIE MAINTENANT !',
        de: 'JETZT VERIFIZIEREN!',
        it: 'VERIFICA ORA!',
        es: '¡VERIFICA AHORA!',
      },
    },
    {
      key: 'THUMBNAIL_1_URL',
      label: 'Thumbnail 1 Image URL',
      type: 'url',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/Thumbnail_1_1452023b-7.webp',
    },
    {
      key: 'THUMBNAIL_1_LABEL',
      label: 'Thumbnail 1 Label',
      type: 'text',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValues: {
        en: 'Exclusive Bonuses',
        fr: 'Bonus exclusifs',
        de: 'Exklusive Boni',
        it: 'Bonus esclusivi',
        es: 'Bonos exclusivos',
      },
    },
    {
      key: 'THUMBNAIL_2_URL',
      label: 'Thumbnail 2 Image URL',
      type: 'url',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/Thumbnail_2_9b47b69c-0.webp',
    },
    {
      key: 'THUMBNAIL_2_LABEL',
      label: 'Thumbnail 2 Label',
      type: 'text',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValues: {
        en: '10000+ Games',
        fr: '10000+ Jeux',
        de: '10000+ Spiele',
        it: '10000+ Giochi',
        es: '10000+ Juegos',
      },
    },
    {
      key: 'THUMBNAIL_3_URL',
      label: 'Thumbnail 3 Image URL',
      type: 'url',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValue: 'https://d7xz328ytuxde.cloudfront.net/x7c/pages/Thumbnail_3_19ee31f0-9.webp',
    },
    {
      key: 'THUMBNAIL_3_LABEL',
      label: 'Thumbnail 3 Label',
      type: 'text',
      defaultRequired: false,
      group: 'Thumbnails',
      defaultValues: {
        en: 'Instant Withdrawals',
        fr: 'Retraits instantanés',
        de: 'Sofortige Auszahlungen',
        it: 'Prelievi istantanei',
        es: 'Retiros instantáneos',
      },
    },
  ]

  const x7LockedFields = [
    {
      key: 'X7_LOGO_URL',
      label: 'X7 Casino Logo URL',
      value: 'https://scdn.ntgm.rocks/image/stakes/auto/auto/X7%20CASINO_FullColour.png',
      note: 'X7 brand logo — update to apply globally',
      isReadOnly: false,
    },
  ]

  const x7EV = await prisma.masterTemplate.upsert({
    where: { slug: 'x7-email-verification' },
    update: {
      baseFilePath: `${templateBaseDir}/master-templates/x7/email-verification`,
      editableFields: x7EditableFields,
      lockedFields: x7LockedFields,
    },
    create: {
      name: 'Email Verification',
      slug: 'x7-email-verification',
      brand: 'X7',
      description: 'X7 Casino email verification template — single body, no domain conditional.',
      baseFilePath: `${templateBaseDir}/master-templates/x7/email-verification`,
      isActive: true,
      editableFields: x7EditableFields,
      lockedFields: x7LockedFields,
    },
  })
  console.log(`✓ X7 Email Verification: ${x7EV.id}`)

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
