export type ChecklistAnswer = 'positive' | 'negative'
export type ChecklistState = Record<string, ChecklistAnswer | boolean | string | undefined>

export function getChecklistAnswer(value: ChecklistState[string]): ChecklistAnswer | undefined {
  if (value === 'positive' || value === 'negative') return value
  if (value === true) return 'positive'
  return undefined
}

export function isPositiveAnswer(value: ChecklistState[string]): boolean {
  return getChecklistAnswer(value) === 'positive'
}

export function isAnswered(value: ChecklistState[string]): boolean {
  return getChecklistAnswer(value) !== undefined
}

export function getNextChecklistAnswer(value: ChecklistState[string]): ChecklistAnswer | undefined {
  const answer = getChecklistAnswer(value)
  if (answer === undefined) return 'positive'
  if (answer === 'positive') return 'negative'
  return undefined
}
