import type { FileEntry, FileGroup, FlowStep, Submission } from "../../../../../app/schemas/submit"

export const mkEntry = (id: string, overrides: Partial<FileEntry> = {}): FileEntry => ({
  id,
  buttonType: "sequence-read",
  filename: "",
  organism: "eukaryote",
  access: "open",
  dataForm: "raw",
  groupId: `${id}-g`,
  chipTags: [],
  ...overrides,
})

export const mkGroup = (id: string, overrides: Partial<FileGroup> = {}): FileGroup => ({
  id,
  groupType: "single",
  memberFileIds: [],
  linkedGroupIds: [],
  ...overrides,
})

export const mkSubmission = (overrides: Partial<Submission> = {}): Submission => ({
  fileEntries: [],
  fileGroups: [],
  notes: "",
  ...overrides,
})

export const mkStep = (
  overrides: Partial<FlowStep> & Pick<FlowStep, "service">,
): FlowStep => ({
  id: `${overrides.service}:test`,
  scope: { groupIds: [], entryIds: ["e"] },
  notes: [],
  ...overrides,
})
