import { Client, type Room } from 'colyseus.js'
import { useEmpireStore, type AgentData, type CompanyData, type SGMApproval } from '../store/empireStore.js'

type SchemaMap<T> = Map<string, T> | Record<string, T> | { forEach: (callback: (value: T, key: string) => void) => void }

interface CompanyCardWire {
  companyId: string
  name: string
  type: string
  agentCount: number
  status: CompanyData['status']
  alertCount: number
}

interface ApprovalWire {
  id: string
  type: string
  companyId: string
  agentId: string
  agentName: string
  message: string
  createdAt: string
}

interface EmpireStateWire {
  companies: SchemaMap<CompanyCardWire>
  approvalQueue: SchemaMap<ApprovalWire>
}

interface EmpireSnapshotWire {
  companies: CompanyCardWire[]
  approvalQueue: ApprovalWire[]
}

interface OfficeAgentWire {
  id: string
  name: string
  role: string
  department: string
  status: AgentData['status']
  currentTask: string
  qualityScore: number
  tasksCompleted: number
}

interface OfficeStateWire {
  companyId: string
  agents: SchemaMap<OfficeAgentWire>
}

interface OfficeSnapshotWire {
  companyId: string
  agents: OfficeAgentWire[]
}

const serverUrl = import.meta.env['VITE_SERVER_WS_URL'] ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3000`

const client = new Client(serverUrl)
let empireRoom: Room<EmpireStateWire> | null = null
let empireConnectPromise: Promise<Room<EmpireStateWire>> | null = null
const officeRooms = new Map<string, Promise<Room<OfficeStateWire>>>()

function mapToRecord<T>(value: SchemaMap<T> | undefined): Record<string, T> {
  const record: Record<string, T> = {}
  if (!value) return record

  if (typeof (value as { forEach?: unknown }).forEach === 'function') {
    ;(value as { forEach: (callback: (item: T, key: string) => void) => void }).forEach((item, key) => {
      record[key] = item
    })
    return record
  }

  return value as Record<string, T>
}

function syncEmpireState(state: EmpireStateWire): void {
  const currentCompanies = useEmpireStore.getState().companies
  const companies: Record<string, CompanyData> = {}

  for (const company of Object.values(mapToRecord(state.companies))) {
    companies[company.companyId] = {
      companyId: company.companyId,
      name: company.name,
      type: company.type,
      agentCount: company.agentCount,
      status: company.status,
      alertCount: company.alertCount,
      agents: currentCompanies[company.companyId]?.agents ?? {},
    }
  }

  useEmpireStore.getState().setCompanies(companies)
  useEmpireStore.getState().setApprovals(mapToRecord(state.approvalQueue) as Record<string, SGMApproval>)
}

function syncEmpireSnapshot(snapshot: EmpireSnapshotWire): void {
  const currentCompanies = useEmpireStore.getState().companies
  const companies: Record<string, CompanyData> = {}

  for (const company of snapshot.companies) {
    companies[company.companyId] = {
      companyId: company.companyId,
      name: company.name,
      type: company.type,
      agentCount: company.agentCount,
      status: company.status,
      alertCount: company.alertCount,
      agents: currentCompanies[company.companyId]?.agents ?? {},
    }
  }

  const approvals: Record<string, SGMApproval> = {}
  for (const item of snapshot.approvalQueue) {
    approvals[item.id] = item
  }

  useEmpireStore.getState().setCompanies(companies)
  useEmpireStore.getState().setApprovals(approvals)
}

function syncOfficeState(state: OfficeStateWire): void {
  const agents: Record<string, AgentData> = {}

  for (const agent of Object.values(mapToRecord(state.agents))) {
    agents[agent.id] = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      status: agent.status,
      currentTask: agent.currentTask,
      qualityScore: agent.qualityScore,
      tasksCompleted: agent.tasksCompleted,
    }
  }

  useEmpireStore.getState().updateCompany(state.companyId, {
    agentCount: Object.keys(agents).length,
    agents,
  })
}

function syncOfficeSnapshot(snapshot: OfficeSnapshotWire): void {
  const agents: Record<string, AgentData> = {}

  for (const agent of snapshot.agents) {
    agents[agent.id] = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      status: agent.status,
      currentTask: agent.currentTask,
      qualityScore: agent.qualityScore,
      tasksCompleted: agent.tasksCompleted,
    }
  }

  useEmpireStore.getState().updateCompany(snapshot.companyId, {
    agentCount: Object.keys(agents).length,
    agents,
  })
}

export async function connectEmpireRoom(): Promise<Room<EmpireStateWire>> {
  if (empireRoom) return empireRoom
  if (empireConnectPromise) return empireConnectPromise

  useEmpireStore.getState().setConnectionStatus('connecting')
  empireConnectPromise = client.joinOrCreate<EmpireStateWire>('empire')
    .then((room) => {
      empireRoom = room
      useEmpireStore.getState().setConnectionStatus('connected')
      syncEmpireState(room.state)
      room.onStateChange((state) => syncEmpireState(state))
      room.onMessage('empire_snapshot', (snapshot: EmpireSnapshotWire) => syncEmpireSnapshot(snapshot))
      room.send('request_snapshot')
      room.onLeave(() => {
        empireRoom = null
        empireConnectPromise = null
        useEmpireStore.getState().setConnectionStatus('disconnected')
      })
      return room
    })
    .catch((error: unknown) => {
      empireConnectPromise = null
      useEmpireStore.getState().setConnectionStatus('error')
      throw error
    })

  return empireConnectPromise
}

export async function joinOfficeRoom(companyId: string): Promise<Room<OfficeStateWire>> {
  const existing = officeRooms.get(companyId)
  if (existing) return existing

  const roomPromise = client.joinOrCreate<OfficeStateWire>('office', { companyId })
    .then((room) => {
      syncOfficeState(room.state)
      room.onStateChange((state) => syncOfficeState(state))
      room.onMessage('office_snapshot', (snapshot: OfficeSnapshotWire) => syncOfficeSnapshot(snapshot))
      room.send('request_snapshot')
      room.onLeave(() => officeRooms.delete(companyId))
      return room
    })
    .catch((error: unknown) => {
      officeRooms.delete(companyId)
      throw error
    })

  officeRooms.set(companyId, roomPromise)
  return roomPromise
}

export async function sendSGMDecision(approvalId: string, decision: 'approve' | 'reject'): Promise<void> {
  const room = await connectEmpireRoom()
  room.send('sgm_approval', { approvalId, decision })
}

export async function sendBossCommand(companyId: string, agentId: string, command: string): Promise<void> {
  const room = await joinOfficeRoom(companyId)
  room.send('boss_command', { agentId, command })
}

export async function sendLearnSkill(companyId: string, agentId: string, skillName: string, content: string): Promise<void> {
  const room = await joinOfficeRoom(companyId)
  room.send('learn_skill', { agentId, skillName, content })
}
