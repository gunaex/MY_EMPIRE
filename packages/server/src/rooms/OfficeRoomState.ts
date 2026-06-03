import { Schema, type, MapSchema } from '@colyseus/schema'

export class AgentStateSchema extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') role: string = ''
  @type('string') department: string = ''
  @type('string') status: string = 'idle'
  @type('string') currentTask: string = ''
  @type('number') qualityScore: number = 1.0
  @type('number') tasksCompleted: number = 0
}

export class OfficeRoomState extends Schema {
  @type('string') companyId: string = ''
  @type('string') companyName: string = ''
  @type({ map: AgentStateSchema }) agents = new MapSchema<AgentStateSchema>()
  @type('number') activeAgentCount: number = 0
}
