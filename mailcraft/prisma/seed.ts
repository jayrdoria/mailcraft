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

  // ── Accounts — upsert by email, update password + name on re-seed ──
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

  // ── Stakes — Email Verification master template ────────
  const templateBaseDir = process.env.TEMPLATE_BASE_DIR ?? './data/templates'

  const stakesEV = await prisma.masterTemplate.upsert({
    where: { slug: 'stakes-email-verification' },
    update: {},
    create: {
      name: 'Email Verification',
      slug: 'stakes-email-verification',
      brand: 'STAKES',
      description:
        'Stakes Casino & Stakes.com email verification — dual-domain CIO template. Contains *|IF:DOMAIN_URL=stakescasino.com|* conditional evaluated by Customer.io at send time.',
      baseFilePath: `${templateBaseDir}/master-templates/stakes/email-verification`,
      isActive: true,
      editableFields: [
        {
          key: 'BANNER_URL',
          label: 'Banner Image URL',
          type: 'url',
          defaultRequired: true,
          group: 'Header',
          placeholder: 'https://cdn.example.com/banner-en.png',
        },
        {
          key: 'TAGLINE',
          label: 'Tagline',
          type: 'text',
          defaultRequired: false,
          group: 'Body',
          defaultValue: 'Verify your email to start playing.',
        },
        {
          key: 'BODY_COPY',
          label: 'Body Copy',
          type: 'richtext',
          defaultRequired: false,
          group: 'Body',
        },
        {
          key: 'CTA_BUTTON_TEXT',
          label: 'Verify Button Text',
          type: 'text',
          defaultRequired: false,
          group: 'Body',
          defaultValue: 'VERIFY NOW!',
        },
        {
          key: 'THUMBNAIL_1_URL',
          label: 'Thumbnail 1 Image URL',
          type: 'url',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_1_LABEL',
          label: 'Thumbnail 1 Label',
          type: 'text',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_2_URL',
          label: 'Thumbnail 2 Image URL',
          type: 'url',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_2_LABEL',
          label: 'Thumbnail 2 Label',
          type: 'text',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_3_URL',
          label: 'Thumbnail 3 Image URL',
          type: 'url',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_3_LABEL',
          label: 'Thumbnail 3 Label',
          type: 'text',
          defaultRequired: false,
          group: 'Thumbnails',
        },
      ],
      lockedFields: [
        {
          key: 'STAKES_CASINO_LOGO_URL',
          label: 'Stakes Casino Logo URL',
          value: '',
          note: 'Brand logo for stakescasino.com variant — update to apply globally',
          isReadOnly: false,
        },
        {
          key: 'STAKES_LOGO_URL',
          label: 'Stakes Logo URL',
          value: '',
          note: 'Brand logo for stakes.com variant — update to apply globally',
          isReadOnly: false,
        },
        {
          key: 'PLAYER_FNAME',
          label: 'Player First Name',
          value: '*|FNAME|*',
          note: 'CIO personalization merge tag — never change',
          isReadOnly: true,
        },
        {
          key: 'REGISTRATION_COMPLETEREGURL_TOKEN',
          label: 'Verify Button Link',
          value: '*|REGISTRATION_COMPLETEREGURL_TOKEN|*',
          note: 'CIO account activation token — never change',
          isReadOnly: true,
        },
      ],
    },
  })
  console.log(`✓ Stakes Email Verification master template: ${stakesEV.id}`)

  // ── X7 — Email Verification master template ────────────
  const x7EV = await prisma.masterTemplate.upsert({
    where: { slug: 'x7-email-verification' },
    update: {},
    create: {
      name: 'Email Verification',
      slug: 'x7-email-verification',
      brand: 'X7',
      description: 'X7 Casino email verification template — single body, no domain conditional.',
      baseFilePath: `${templateBaseDir}/master-templates/x7/email-verification`,
      isActive: true,
      editableFields: [
        {
          key: 'BANNER_URL',
          label: 'Banner Image URL',
          type: 'url',
          defaultRequired: true,
          group: 'Header',
          placeholder: 'https://cdn.example.com/banner-en.png',
        },
        {
          key: 'TAGLINE',
          label: 'Tagline',
          type: 'text',
          defaultRequired: false,
          group: 'Body',
          defaultValue: 'Verify your email to start playing.',
        },
        {
          key: 'BODY_COPY',
          label: 'Body Copy',
          type: 'richtext',
          defaultRequired: false,
          group: 'Body',
        },
        {
          key: 'CTA_BUTTON_TEXT',
          label: 'Verify Button Text',
          type: 'text',
          defaultRequired: false,
          group: 'Body',
          defaultValue: 'VERIFY NOW!',
        },
        {
          key: 'THUMBNAIL_1_URL',
          label: 'Thumbnail 1 Image URL',
          type: 'url',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_1_LABEL',
          label: 'Thumbnail 1 Label',
          type: 'text',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_2_URL',
          label: 'Thumbnail 2 Image URL',
          type: 'url',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_2_LABEL',
          label: 'Thumbnail 2 Label',
          type: 'text',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_3_URL',
          label: 'Thumbnail 3 Image URL',
          type: 'url',
          defaultRequired: false,
          group: 'Thumbnails',
        },
        {
          key: 'THUMBNAIL_3_LABEL',
          label: 'Thumbnail 3 Label',
          type: 'text',
          defaultRequired: false,
          group: 'Thumbnails',
        },
      ],
      lockedFields: [
        {
          key: 'X7_LOGO_URL',
          label: 'X7 Casino Logo URL',
          value: '',
          note: 'X7 brand logo — update to apply globally',
          isReadOnly: false,
        },
        {
          key: 'PLAYER_FNAME',
          label: 'Player First Name',
          value: '*|FNAME|*',
          note: 'CIO personalization merge tag — never change',
          isReadOnly: true,
        },
        {
          key: 'REGISTRATION_COMPLETEREGURL_TOKEN',
          label: 'Verify Button Link',
          value: '*|REGISTRATION_COMPLETEREGURL_TOKEN|*',
          note: 'CIO account activation token — never change',
          isReadOnly: true,
        },
      ],
    },
  })
  console.log(`✓ X7 Email Verification master template: ${x7EV.id}`)

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
