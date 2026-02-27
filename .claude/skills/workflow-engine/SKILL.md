---
name: workflow-engine
description: Workflow automation and business process management for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["workflow", "automation", "process", "approval flow", "business rule"]
  file_patterns: ["*workflow*", "*automation*", "*process*"]
  context: workflow automation, approval workflows, business process management
mcp_servers:
  - sequential
personas:
  - backend
  - architect
---

# Workflow Engine

## Core Role

Implement workflow automation and business process management:
- Multi-step approval workflows
- Automated task routing
- Business rule engine
- State machine management

---

## Workflow Service

```typescript
// lib/workflow/service.ts
import prisma from '@/lib/prisma'
import { AuditAction, createAuditLog } from '@/lib/audit/logger'

export type WorkflowState = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  transitions: WorkflowTransition[]
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'APPROVAL' | 'REVIEW' | 'NOTIFICATION' | 'AUTO_ACTION'
  assigneeType: 'ROLE' | 'USER' | 'DEPARTMENT_HEAD' | 'SYSTEM'
  assigneeValue: string
  dueDays?: number
  actions: WorkflowAction[]
}

export interface WorkflowAction {
  id: string
  name: string
  type: 'APPROVE' | 'REJECT' | 'FORWARD' | 'RETURN' | 'DELEGATE'
  nextState: string
  requireComment: boolean
}

export interface WorkflowTransition {
  from: string
  to: string
  condition?: string
  autoTransition?: boolean
}

// Workflow Instance Management
export async function startWorkflow(
  definitionId: string,
  entityType: string,
  entityId: number,
  userId: number,
  variables?: Record<string, any>
): Promise<{ instanceId: number; currentStep: string }> {
  // Get workflow definition
  const definition = await getWorkflowDefinition(definitionId)
  if (!definition) {
    throw new Error('Workflow definition not found')
  }

  // Create workflow instance
  const instance = await prisma.workflowInstance.create({
    data: {
      definitionId,
      entityType,
      entityId,
      currentStep: definition.steps[0].id,
      state: 'IN_PROGRESS',
      startedById: userId,
      variables: variables ? JSON.stringify(variables) : null
    }
  })

  // Start first step
  const firstStep = definition.steps[0]
  await startStep(instance.id, firstStep, userId)

  // Create audit log
  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'WorkflowInstance',
    recordId: instance.id,
    userId,
    oldData: null,
    newData: {
      definitionId,
      entityType,
      entityId,
      currentStep: firstStep.id
    }
  })

  return {
    instanceId: instance.id,
    currentStep: firstStep.id
  }
}

// Execute workflow action
export async function executeWorkflowAction(
  instanceId: number,
  stepId: string,
  actionId: string,
  userId: number,
  comment?: string
): Promise<{ success: boolean; nextState: string; completed: boolean }> {
  // Get instance with definition
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId }
  })

  if (!instance) {
    throw new Error('Workflow instance not found')
  }

  const definition = await getWorkflowDefinition(instance.definitionId!)
  const currentStep = definition?.steps.find(s => s.id === stepId)
  const action = currentStep?.actions.find(a => a.id === actionId)

  if (!action || !currentStep || !definition) {
    throw new Error('Invalid action')
  }

  // Check if user can perform this action
  const canAct = await canUserActOnStep(instanceId, stepId, userId)
  if (!canAct) {
    throw new Error('User not authorized for this action')
  }

  // Complete current step
  await prisma.workflowStepInstance.updateMany({
    where: {
      instanceId,
      stepId,
      completedAt: null
    },
    data: {
      completedAt: new Date(),
      action: action.type,
      comment,
      actedById: userId
    }
  })

  // Find transition
  const transition = definition.transitions.find(
    t => t.from === stepId && t.to === action.nextState
  )

  let completed = false
  let nextState = action.nextState

  // Check if workflow is completed
  const isFinalStep = !definition.transitions.some(t => t.from === action.nextState)

  if (isFinalStep || action.type === 'REJECT') {
    // Complete workflow
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        state: action.type === 'REJECT' ? 'REJECTED' : 'APPROVED',
        completedAt: new Date(),
        currentStep: action.nextState
      }
    })
    completed = true
  } else {
    // Move to next step
    const nextStep = definition.steps.find(s => s.id === action.nextState)
    if (nextStep) {
      await startStep(instanceId, nextStep, userId)
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStep: action.nextState }
      })
    }
  }

  // Create audit log
  await createAuditLog({
    action: AuditAction.UPDATE,
    tableName: 'WorkflowInstance',
    recordId: instanceId,
    userId,
    oldData: { step: stepId, state: 'IN_PROGRESS' },
    newData: { step: action.nextState, action: action.type, completed }
  })

  // Trigger callbacks
  await triggerWorkflowCallbacks(instanceId, action.type, instance.entityType, instance.entityId)

  return { success: true, nextState, completed }
}

// Start a workflow step
async function startStep(
  instanceId: number,
  step: WorkflowStep,
  userId: number
): Promise<void> {
  // Resolve assignee
  const assigneeId = await resolveAssignee(step.assigneeType, step.assigneeValue, instanceId)

  // Calculate due date
  const dueDate = step.dueDays
    ? new Date(Date.now() + step.dueDays * 24 * 60 * 60 * 1000)
    : null

  // Create step instance
  await prisma.workflowStepInstance.create({
    data: {
      instanceId,
      stepId: step.id,
      assignedToId: assigneeId,
      dueAt: dueDate,
      startedAt: new Date()
    }
  })

  // Send notification to assignee
  if (assigneeId && step.type !== 'AUTO_ACTION') {
    await sendWorkflowNotification(instanceId, step.id, assigneeId, 'ASSIGNED')
  }
}

// Resolve assignee based on type
async function resolveAssignee(
  type: string,
  value: string,
  instanceId: number
): Promise<number | null> {
  switch (type) {
    case 'USER':
      return parseInt(value)

    case 'ROLE': {
      // Get first user with this role
      const user = await prisma.user.findFirst({
        where: {
          userRoles: { some: { role: { slug: value } } },
          status: 'ACTIVE'
        }
      })
      return user?.id || null
    }

    case 'DEPARTMENT_HEAD': {
      // Get instance to find department
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          // Assuming request has department
          request: { select: { userId: true } }
        }
      })

      if (!instance?.request) return null

      const requester = await prisma.user.findUnique({
        where: { id: instance.request.userId },
        include: { department: true }
      })

      if (!requester?.departmentId) return null

      // Find department head
      const dept = await prisma.department.findUnique({
        where: { id: requester.departmentId }
      })

      return dept?.headId || null
    }

    case 'SYSTEM':
      return null

    default:
      return null
  }
}

// Check if user can act on step
async function canUserActOnStep(
  instanceId: number,
  stepId: string,
  userId: number
): Promise<boolean> {
  const stepInstance = await prisma.workflowStepInstance.findFirst({
    where: {
      instanceId,
      stepId,
      completedAt: null,
      assignedToId: userId
    }
  })

  return !!stepInstance
}

// Get workflow definition
async function getWorkflowDefinition(definitionId: string): Promise<WorkflowDefinition | null> {
  // In production, this would come from database
  const definitions: Record<string, WorkflowDefinition> = {
    'request_approval': {
      id: 'request_approval',
      name: { en: 'Request Approval', th: 'ขออนุมัติคำขอ' } as any,
      description: { en: 'Standard request approval workflow', th: 'เวิร์กโฟลว์อนุมัติคำขอมาตรฐาน' } as any,
      steps: [
        {
          id: 'submit',
          name: { en: 'Submit Request', th: 'ส่งคำขอ' } as any,
          type: 'APPROVAL',
          assigneeType: 'ROLE',
          assigneeValue: 'approver',
          dueDays: 3,
          actions: [
            { id: 'approve', name: { en: 'Approve', th: 'อนุมัติ' } as any, type: 'APPROVE', nextState: 'final_approval', requireComment: false },
            { id: 'reject', name: { en: 'Reject', th: 'ปฏิเสธ' } as any, type: 'REJECT', nextState: 'rejected', requireComment: true }
          ]
        },
        {
          id: 'final_approval',
          name: { en: 'Final Approval', th: 'อนุมัติขั้นสุดท้าย' } as any,
          type: 'APPROVAL',
          assigneeType: 'ROLE',
          assigneeValue: 'admin',
          dueDays: 2,
          actions: [
            { id: 'approve', name: { en: 'Approve', th: 'อนุมัติ' } as any, type: 'APPROVE', nextState: 'approved', requireComment: false },
            { id: 'reject', name: { en: 'Reject', th: 'ปฏิเสธ' } as any, type: 'REJECT', nextState: 'rejected', requireComment: true },
            { id: 'return', name: { en: 'Return for Revision', th: 'ส่งกลับแก้ไข' } as any, type: 'RETURN', nextState: 'submit', requireComment: true }
          ]
        }
      ],
      transitions: [
        { from: 'submit', to: 'final_approval' },
        { from: 'submit', to: 'rejected' },
        { from: 'final_approval', to: 'approved' },
        { from: 'final_approval', to: 'rejected' },
        { from: 'final_approval', to: 'submit' }
      ]
    }
  }

  return definitions[definitionId] || null
}

// Get pending tasks for user
export async function getPendingWorkflowTasks(
  userId: number,
  locale: string = 'en'
): Promise<Array<{
  id: number
  instanceId: number
  stepId: string
  stepName: string
  entityType: string
  entityId: number
  entityName: string
  dueAt: Date | null
  startedAt: Date
}>> {
  const pendingSteps = await prisma.workflowStepInstance.findMany({
    where: {
      assignedToId: userId,
      completedAt: null
    },
    include: {
      instance: true
    },
    orderBy: { dueAt: 'asc' }
  })

  const results = []

  for (const step of pendingSteps) {
    const definition = await getWorkflowDefinition(step.instance.definitionId!)
    const stepDef = definition?.steps.find(s => s.id === step.stepId)

    // Get entity name
    let entityName = ''
    if (step.instance.entityType === 'Request') {
      const request = await prisma.request.findUnique({
        where: { id: step.instance.entityId },
        select: { requestCode: true }
      })
      entityName = request?.requestCode || ''
    }

    results.push({
      id: step.id,
      instanceId: step.instance.id,
      stepId: step.stepId,
      stepName: locale === 'th'
        ? (stepDef?.name as any)?.th || stepDef?.name || ''
        : typeof stepDef?.name === 'string' ? stepDef.name : (stepDef?.name as any)?.en || '',
      entityType: step.instance.entityType,
      entityId: step.instance.entityId,
      entityName,
      dueAt: step.dueAt,
      startedAt: step.startedAt
    })
  }

  return results
}

// Trigger workflow callbacks
async function triggerWorkflowCallbacks(
  instanceId: number,
  actionType: string,
  entityType: string,
  entityId: number
): Promise<void> {
  // Update related entity based on workflow state
  if (entityType === 'Request') {
    let newStatus = 'PENDING'

    switch (actionType) {
      case 'APPROVE':
        newStatus = 'APPROVED'
        break
      case 'REJECT':
        newStatus = 'REJECTED'
        break
    }

    if (newStatus !== 'PENDING') {
      await prisma.request.update({
        where: { id: entityId },
        data: {
          status: newStatus,
          approvedAt: actionType === 'APPROVE' ? new Date() : null
        }
      })
    }
  }
}

// Send workflow notification
async function sendWorkflowNotification(
  instanceId: number,
  stepId: string,
  userId: number,
  type: 'ASSIGNED' | 'REMINDER' | 'ESCALATED'
): Promise<void> {
  const typeLabels = {
    ASSIGNED: { en: 'Task Assigned', th: 'ได้รับมอบหมายงาน' },
    REMINDER: { en: 'Task Reminder', th: 'เตือนงาน' },
    ESCALATED: { en: 'Task Escalated', th: 'งานถูกยกระดับ' }
  }

  await prisma.notification.create({
    data: {
      userId,
      type: 'WORKFLOW',
      title: typeLabels[type].en,
      message: `You have a pending workflow task`,
      data: JSON.stringify({ instanceId, stepId }),
      read: false
    }
  })
}

// Get workflow history
export async function getWorkflowHistory(
  instanceId: number
): Promise<Array<{
  stepId: string
  stepName: string
  action: string
  actor: string
  comment: string | null
  startedAt: Date
  completedAt: Date | null
}>> {
  const steps = await prisma.workflowStepInstance.findMany({
    where: { instanceId },
    include: {
      actedBy: { select: { name: true } }
    },
    orderBy: { startedAt: 'asc' }
  })

  const definition = await prisma.workflowInstance.findUnique({
    where: { id: instanceId }
  }).then(i => i ? getWorkflowDefinition(i.definitionId!) : null)

  return steps.map(step => {
    const stepDef = definition?.steps.find(s => s.id === step.stepId)

    return {
      stepId: step.stepId,
      stepName: typeof stepDef?.name === 'string' ? stepDef.name : '',
      action: step.action || '',
      actor: step.actedBy?.name || '',
      comment: step.comment,
      startedAt: step.startedAt,
      completedAt: step.completedAt
    }
  })
}

// Cancel workflow
export async function cancelWorkflow(
  instanceId: number,
  userId: number,
  reason: string
): Promise<void> {
  await prisma.workflowInstance.update({
    where: { id: instanceId },
    data: {
      state: 'CANCELLED',
      completedAt: new Date()
    }
  })

  // Cancel pending steps
  await prisma.workflowStepInstance.updateMany({
    where: {
      instanceId,
      completedAt: null
    },
    data: {
      completedAt: new Date(),
      action: 'CANCELLED',
      comment: reason,
      actedById: userId
    }
  })

  await createAuditLog({
    action: AuditAction.UPDATE,
    tableName: 'WorkflowInstance',
    recordId: instanceId,
    userId,
    oldData: { state: 'IN_PROGRESS' },
    newData: { state: 'CANCELLED', reason }
  })
}
```

---

## Workflow Status Component

```typescript
// components/workflow/workflow-status.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  User,
  MessageSquare
} from 'lucide-react'

interface WorkflowStatusProps {
  instanceId: number
  currentStep: string
  state: string
  history: Array<{
    stepId: string
    stepName: string
    action: string
    actor: string
    comment: string | null
    startedAt: Date
    completedAt: Date | null
  }>
  steps: Array<{
    id: string
    name: string
    type: string
  }>
  canAct?: boolean
  onAction?: (stepId: string, actionId: string, comment?: string) => void
}

export function WorkflowStatus({
  instanceId,
  currentStep,
  state,
  history,
  steps,
  canAct,
  onAction
}: WorkflowStatusProps) {
  const { locale } = useI18n()

  const stateColors: Record<string, string> = {
    PENDING: 'bg-yellow-500',
    IN_PROGRESS: 'bg-blue-500',
    APPROVED: 'bg-green-500',
    REJECTED: 'bg-red-500',
    CANCELLED: 'bg-gray-500'
  }

  const stateLabels = {
    PENDING: { en: 'Pending', th: 'รอดำเนินการ' },
    IN_PROGRESS: { en: 'In Progress', th: 'กำลังดำเนินการ' },
    APPROVED: { en: 'Approved', th: 'อนุมัติแล้ว' },
    REJECTED: { en: 'Rejected', th: 'ปฏิเสธ' },
    CANCELLED: { en: 'Cancelled', th: 'ยกเลิกแล้ว' }
  }

  const actionLabels: Record<string, { en: string; th: string }> = {
    APPROVE: { en: 'Approved', th: 'อนุมัติ' },
    REJECT: { en: 'Rejected', th: 'ปฏิเสธ' },
    FORWARD: { en: 'Forwarded', th: 'ส่งต่อ' },
    RETURN: { en: 'Returned', th: 'ส่งกลับ' },
    DELEGATE: { en: 'Delegated', th: 'มอบหมาย' }
  }

  const getStepStatus = (stepId: string) => {
    const historyItem = history.find(h => h.stepId === stepId)
    if (historyItem?.completedAt) return 'completed'
    if (stepId === currentStep && state === 'IN_PROGRESS') return 'current'
    return 'pending'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {locale === 'th' ? 'สถานะเวิร์กโฟลว์' : 'Workflow Status'}
          </CardTitle>
          <Badge className={stateColors[state]}>
            {locale === 'th' ? stateLabels[state].th : stateLabels[state].en}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id)
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        status === 'completed'
                          ? 'bg-green-500 text-white'
                          : status === 'current'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center max-w-[80px]">
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight
                      className={`h-4 w-4 mx-2 ${
                        getStepStatus(steps[index + 1].id) !== 'pending'
                          ? 'text-green-500'
                          : 'text-gray-300'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* History Timeline */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">
            {locale === 'th' ? 'ประวัติ' : 'History'}
          </h4>
          <ScrollArea className="h-40">
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 pb-3 border-b last:border-0"
                >
                  <div className="mt-1">
                    {item.action === 'APPROVE' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : item.action === 'REJECT' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.stepName}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.action && (
                          <Badge variant="outline" className="text-xs">
                            {actionLabels[item.action]
                              ? locale === 'th'
                                ? actionLabels[item.action].th
                                : actionLabels[item.action].en
                              : item.action}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <span>{item.actor}</span>
                      <span>•</span>
                      <span>
                        {new Date(item.completedAt || item.startedAt).toLocaleString(
                          locale === 'th' ? 'th-TH' : 'en-US'
                        )}
                      </span>
                    </div>
                    {item.comment && (
                      <div className="flex items-start gap-2 mt-2 text-sm bg-muted p-2 rounded">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>{item.comment}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Workflow Action Panel

```typescript
// components/workflow/workflow-action-panel.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowRight,
  Loader2
} from 'lucide-react'

interface WorkflowActionPanelProps {
  stepId: string
  actions: Array<{
    id: string
    name: string
    type: 'APPROVE' | 'REJECT' | 'FORWARD' | 'RETURN' | 'DELEGATE'
    requireComment: boolean
  }>
  onAction: (actionId: string, comment?: string) => Promise<void>
}

export function WorkflowActionPanel({
  stepId,
  actions,
  onAction
}: WorkflowActionPanelProps) {
  const { locale } = useI18n()
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const actionIcons = {
    APPROVE: <CheckCircle className="h-4 w-4 mr-2" />,
    REJECT: <XCircle className="h-4 w-4 mr-2" />,
    RETURN: <RotateCcw className="h-4 w-4 mr-2" />,
    FORWARD: <ArrowRight className="h-4 w-4 mr-2" />,
    DELEGATE: <ArrowRight className="h-4 w-4 mr-2" />
  }

  const actionVariants: Record<string, 'default' | 'destructive' | 'outline'> = {
    APPROVE: 'default',
    REJECT: 'destructive',
    RETURN: 'outline',
    FORWARD: 'outline',
    DELEGATE: 'outline'
  }

  const handleActionClick = (actionId: string, requireComment: boolean) => {
    setSelectedAction(actionId)
    if (requireComment) {
      setShowDialog(true)
    } else {
      executeAction(actionId)
    }
  }

  const executeAction = async (actionId: string) => {
    setLoading(true)
    try {
      await onAction(actionId, comment || undefined)
      setShowDialog(false)
      setComment('')
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={actionVariants[action.type]}
            onClick={() => handleActionClick(action.id, action.requireComment)}
            disabled={loading}
          >
            {actionIcons[action.type]}
            {action.name}
          </Button>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === 'th' ? 'เพิ่มความคิดเห็น' : 'Add Comment'}
            </DialogTitle>
            <DialogDescription>
              {locale === 'th'
                ? 'โปรดระบุเหตุผลสำหรับการดำเนินการนี้'
                : 'Please provide a reason for this action'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>
              {locale === 'th' ? 'ความคิดเห็น' : 'Comment'}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                locale === 'th'
                  ? 'ระบุเหตุผลหรือความคิดเห็น...'
                  : 'Enter reason or comment...'
              }
              rows={4}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button
              onClick={() => selectedAction && executeAction(selectedAction)}
              disabled={loading || !comment.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {locale === 'th' ? 'ยืนยัน' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

## Prisma Schema

```prisma
// Workflow Instance
model WorkflowInstance {
  id            Int       @id @default(autoincrement())
  definitionId  String?
  entityType    String
  entityId      Int
  currentStep   String
  state         String    @default("IN_PROGRESS")
  variables     String?   // JSON
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  startedById   Int

  startedBy     User      @relation("WorkflowStarter", fields: [startedById], references: [id])
  stepInstances WorkflowStepInstance[]

  @@index([entityType, entityId])
  @@index([startedById])
  @@index([state])
}

// Workflow Step Instance
model WorkflowStepInstance {
  id          Int       @id @default(autoincrement())
  instanceId  Int
  stepId      String
  assignedToId Int?
  action      String?
  comment     String?
  startedAt   DateTime  @default(now())
  dueAt       DateTime?
  completedAt DateTime?
  actedById   Int?

  instance    WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  assignedTo  User?            @relation("WorkflowAssignee", fields: [assignedToId], references: [id])
  actedBy     User?            @relation("WorkflowActor", fields: [actedById], references: [id])

  @@index([instanceId])
  @@index([assignedToId, completedAt])
}
```

---

## Usage Examples

```tsx
// Example 1: Start workflow when creating request
import { startWorkflow } from '@/lib/workflow/service'

async function createRequest(data: RequestData, userId: number) {
  const request = await prisma.request.create({
    data: { ...data, userId, status: 'PENDING' }
  })

  // Start approval workflow
  await startWorkflow(
    'request_approval',
    'Request',
    request.id,
    userId,
    { priority: data.priority, amount: data.items.length }
  )

  return request
}

// Example 2: Display workflow status in request detail
import { WorkflowStatus } from '@/components/workflow/workflow-status'
import { getWorkflowHistory } from '@/lib/workflow/service'

async function RequestDetailPage({ requestId }: { requestId: number }) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { workflowInstances: true }
  })

  const instance = request?.workflowInstances[0]
  if (!instance) return null

  const history = await getWorkflowHistory(instance.id)

  return (
    <WorkflowStatus
      instanceId={instance.id}
      currentStep={instance.currentStep}
      state={instance.state}
      history={history}
      steps={[
        { id: 'submit', name: 'Submit', type: 'APPROVAL' },
        { id: 'final_approval', name: 'Final Approval', type: 'APPROVAL' }
      ]}
    />
  )
}

// Example 3: Pending tasks dashboard
import { getPendingWorkflowTasks } from '@/lib/workflow/service'

async function PendingTasksCard({ userId }: { userId: number }) {
  const tasks = await getPendingWorkflowTasks(userId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.map(task => (
          <div key={task.id} className="flex justify-between items-center py-2">
            <div>
              <p className="font-medium">{task.stepName}</p>
              <p className="text-sm text-muted-foreground">{task.entityName}</p>
            </div>
            {task.dueAt && (
              <Badge variant={isOverdue(task.dueAt) ? 'destructive' : 'outline'}>
                {formatDueDate(task.dueAt)}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
