import { Schema, type, MapSchema } from '@colyseus/schema'

export class CompanyCardSchema extends Schema {
  @type('string') companyId: string = ''
  @type('string') name: string = ''
  @type('string') type: string = 'ecommerce'
  @type('number') agentCount: number = 0
  @type('string') status: string = 'active'   // 'active' | 'alert' | 'paused'
  @type('number') alertCount: number = 0
}

export class SGMApprovalItem extends Schema {
  @type('string') id: string = ''
  @type('string') type: string = ''            // 'fire_agent' | 'hire_agent' | 'strategy_change'
  @type('string') companyId: string = ''
  @type('string') agentId: string = ''
  @type('string') agentName: string = ''
  @type('string') message: string = ''         // ภาษาไทย
  @type('string') createdAt: string = ''
}

export class EmpireRoomState extends Schema {
  @type({ map: CompanyCardSchema }) companies = new MapSchema<CompanyCardSchema>()
  @type({ map: SGMApprovalItem }) approvalQueue = new MapSchema<SGMApprovalItem>()
  @type('number') totalAgents: number = 0
  @type('number') activeCompanies: number = 0
}
