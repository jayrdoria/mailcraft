import { create } from 'zustand'
import type {
  MultiLanguageFieldValues,
  SavedSectionConfig,
  Language,
  FieldValue,
} from '@/lib/types/template'
import { LANGUAGES } from '@/lib/types/template'

export interface SetupConfig {
  activeSections: string[]
  requiredFields: string[]
  deletedSections: string[]
}

interface EditorStore {
  // Template identity
  templateName: string
  masterTemplateId: string
  savedTemplateId: string | null
  brand: string

  // Master HTML (fetched once — locked fields pre-injected, editable fields still {{TOKEN}})
  masterPreviewHtml: string

  // Setup config
  activeSections: string[]
  deletedSections: string[]
  requiredFields: string[]

  // Field values — per language
  fieldValues: MultiLanguageFieldValues

  // Preview
  renderedHtml: string
  device: 'desktop' | 'tablet' | 'mobile'

  // Language
  activeLanguage: Language
  supportedLanguages: Language[]

  // State
  isDirty: boolean
  isSaving: boolean
  isSetupModalOpen: boolean

  // Actions
  init: (data: {
    masterTemplateId: string
    savedTemplateId: string | null
    templateName: string
    brand: string
    fieldValues: MultiLanguageFieldValues
    sectionConfig: SavedSectionConfig[]
    masterPreviewHtml: string
    supportedLanguages: Language[]
    openSetupModal: boolean
    allSectionNames?: string[]
  }) => void
  setTemplateName: (name: string) => void
  setFieldValue: (key: string, value: FieldValue) => void
  applySetupConfig: (config: SetupConfig) => void
  setDevice: (device: EditorStore['device']) => void
  setActiveLanguage: (lang: Language) => void
  openSetupModal: () => void
  closeSetupModal: () => void
  setRenderedHtml: (html: string) => void
  setIsSaving: (v: boolean) => void
  markClean: () => void
}

const EMPTY_FIELD_VALUES: MultiLanguageFieldValues = {
  en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {},
}

export const useEditorStore = create<EditorStore>((set) => ({
  templateName: '',
  masterTemplateId: '',
  savedTemplateId: null,
  brand: '',
  masterPreviewHtml: '',
  activeSections: [],
  deletedSections: [],
  requiredFields: [],
  fieldValues: EMPTY_FIELD_VALUES,
  renderedHtml: '',
  device: 'desktop',
  activeLanguage: 'en',
  supportedLanguages: LANGUAGES,
  isDirty: false,
  isSaving: false,
  isSetupModalOpen: false,

  init: (data) => {
    const activeSections = data.sectionConfig.length > 0
      ? data.sectionConfig.filter((s) => s.isActive && !s.isDeleted).map((s) => s.name)
      : (data.allSectionNames ?? [])
    const deletedSections = data.sectionConfig
      .filter((s) => s.isDeleted)
      .map((s) => s.name)

    set({
      masterTemplateId: data.masterTemplateId,
      savedTemplateId: data.savedTemplateId,
      templateName: data.templateName,
      brand: data.brand,
      fieldValues: data.fieldValues,
      activeSections,
      deletedSections,
      masterPreviewHtml: data.masterPreviewHtml,
      supportedLanguages: data.supportedLanguages,
      activeLanguage: data.supportedLanguages[0] ?? 'en',
      isDirty: false,
      isSetupModalOpen: data.openSetupModal,
    })
  },

  setTemplateName: (name) => set({ templateName: name, isDirty: true }),

  setFieldValue: (key, value) =>
    set((state) => ({
      isDirty: true,
      fieldValues: {
        ...state.fieldValues,
        [state.activeLanguage]: {
          ...state.fieldValues[state.activeLanguage],
          [key]: value,
        },
      },
    })),

  applySetupConfig: (config) => {
    const { activeSections, requiredFields, deletedSections } = config
    set({ activeSections, deletedSections, requiredFields, isDirty: true })
  },

  setDevice: (device) => set({ device }),
  setActiveLanguage: (lang) => set({ activeLanguage: lang }),
  openSetupModal: () => set({ isSetupModalOpen: true }),
  closeSetupModal: () => set({ isSetupModalOpen: false }),
  setRenderedHtml: (html) => set({ renderedHtml: html }),
  setIsSaving: (v) => set({ isSaving: v }),
  markClean: () => set({ isDirty: false }),
}))
