import { BASE_RULES } from './base.js'
import { MENS_RULES } from './mens.js'
import { WOMENS_RULES } from './womens.js'
import { MIXED_RULES } from './mixed.js'

export const RULE_TABLE = [...BASE_RULES, ...MENS_RULES, ...WOMENS_RULES, ...MIXED_RULES]

export function rulesForDivision(division) {
  return RULE_TABLE.filter((rule) => rule.appliesToDivisions.includes(division))
}
