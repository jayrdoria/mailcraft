import { create } from 'zustand'
import type {
  MultiLanguageFieldValues,
  SavedSectionConfig,
  Language,
} from '@/lib/types/template'

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

  // Master HTML (fetched once — locked fields pre-injected, editable fields still {{TOKEN}})
  masterPreviewHtml: string

  // Setup config
  activeSections: string[]
  requiredFields: string[]

  // Field values — per language
  fieldValues: MultiLanguageFieldValues

  // Preview
  renderedHtml: string
  device: 'desktop' | 'tablet' | 'mobile'

  // Language
  activeLanguage: Language

  // State
  isDirty: boolean
  isSaving: boolean
  isSetupModalOpen: boolean

  // Actions
  init: (data: {
    masterTemplateId: string
    savedTemplateId: string | null
    templateName: string
    fieldValues: MultiLanguageFieldValues
    sectionConfig: SavedSectionConfig[]
    masterPreviewHtml: string
  }) => void
  setTemplateName: (name: string) => void
  setFieldValue: (key: string, value: string) => void
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
  en: {}, fr: {}, de: {}, it: {}, es: {},
}

export const useEditorStore = create<EditorStore>((set) => ({
  templateName: '',
  masterTemplateId: '',
  savedTemplateId: null,
  masterPreviewHtml: '',
  activeSections: [],
  requiredFields: [],
  fieldValues: EMPTY_FIELD_VALUES,
  renderedHtml: '',
  device: 'desktop',
  activeLanguage: 'en',
  isDirty: false,
  isSaving: false,
  isSetupModalOpen: false,

  init: (data) => {
    const activeSections = data.sectionConfig
      .filter((s) => s.isActive && !s.isDeleted)
      .map((s) => s.name)

    set({
      masterTemplateId: data.masterTemplateId,
      savedTemplateId: data.savedTemplateId,
      templateName: data.templateName,
      fieldValues: data.fieldValues,
      activeSections,
      masterPreviewHtml: data.masterPreviewHtml,
      isDirty: false,
      // Only open setup on first creation (no saved sectionConfig yet)
      isSetupModalOpen: data.sectionConfig.length === 0,
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
    const { activeSections, requiredFields } = config
    set({ activeSections, requiredFields, isDirty: true })
  },

  setDevice: (device) => set({ device }),
  setActiveLanguage: (lang) => set({ activeLanguage: lang }),
  openSetupModal: () => set({ isSetupModalOpen: true }),
  closeSetupModal: () => set({ isSetupModalOpen: false }),
  setRenderedHtml: (html) => set({ renderedHtml: html }),
  setIsSaving: (v) => set({ isSaving: v }),
  markClean: () => set({ isDirty: false }),

  // Expose current field values for the active language + active sections
  // (computed externally — see useEditorPreview hook)
}))
