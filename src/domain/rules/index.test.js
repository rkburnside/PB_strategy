import { describe, it, expect } from 'vitest'
import { RULE_TABLE, rulesForDivision } from './index.js'

const VALID_CATEGORIES = new Set(['opportunity', 'risk', 'execution'])
const VALID_DIVISIONS = new Set(['mens', 'womens', 'mixed'])

describe('RULE_TABLE', () => {
  it('has no duplicate rule ids', () => {
    const ids = RULE_TABLE.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('conforms to the Rule shape from CLAUDE.md for every rule', () => {
    for (const rule of RULE_TABLE) {
      expect(typeof rule.id).toBe('string')
      expect(typeof rule.condition).toBe('function')
      expect(['number', 'function']).toContain(typeof rule.scoreDelta)
      expect(Array.isArray(rule.appliesToDivisions)).toBe(true)
      expect(rule.appliesToDivisions.length).toBeGreaterThan(0)
      for (const division of rule.appliesToDivisions) {
        expect(VALID_DIVISIONS.has(division)).toBe(true)
      }
      expect(typeof rule.explanation).toBe('string')
      expect(rule.explanation.length).toBeGreaterThan(0)
      expect(VALID_CATEGORIES.has(rule.category)).toBe(true)
    }
  })
})

describe('rulesForDivision', () => {
  it('only returns rules whose appliesToDivisions includes the given division', () => {
    for (const division of VALID_DIVISIONS) {
      const rules = rulesForDivision(division)
      expect(rules.every((r) => r.appliesToDivisions.includes(division))).toBe(true)
    }
  })

  it('includes all base (division-agnostic) rules for every division', () => {
    const baseRuleIds = RULE_TABLE.filter((r) => r.appliesToDivisions.length === 3).map((r) => r.id)
    for (const division of VALID_DIVISIONS) {
      const ids = rulesForDivision(division).map((r) => r.id)
      for (const baseId of baseRuleIds) {
        expect(ids).toContain(baseId)
      }
    }
  })
})
