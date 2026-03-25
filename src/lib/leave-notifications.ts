import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { syncLeaveToCalendar, deleteLeaveFromCalendar } from "./google-calendar";
import {
  approvalRequestTemplate,
  approvalResultTemplate,
  proxyLeaveNotificationTemplate,
} from "./mail-templates";
import type { LeaveStatus } from "@prisma/client";

export async function notifyLeaveStatusChange(
  leaveId: string,
  newStatus: LeaveStatus,
  actorId: string
): Promise<void> {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      registeredBy: { select: { id: true, name: true } },
      l1Approver: { select: { id: true, name: true, email: true } },
      l2Approver: { select: { id: true, name: true, email: true } },
    },
  });

  if (!leave) return;

  switch (newStatus) {
    case "PENDING_L1": {
      // SICK leave created → email L1 approver
      if (leave.l1Approver) {
        const template = approvalRequestTemplate({
          requesterName: leave.user.name,
          approverName: leave.l1Approver.name,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days,
          reason: leave.reason,
          isL2: false,
        });
        await sendMail({
          to: leave.l1Approver.email,
          ...template,
          mailType: "APPROVAL_REQUEST",
          leaveRequestId: leaveId,
        }).catch(console.error);
      }
      break;
    }

    case "PENDING_L2": {
      // L1 approved → email HR users
      const hrUsers = await prisma.user.findMany({
        where: { roles: { has: "HR" }, status: "ACTIVE" },
        select: { name: true, email: true },
      });

      for (const hr of hrUsers) {
        const template = approvalRequestTemplate({
          requesterName: leave.user.name,
          approverName: hr.name,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days,
          reason: leave.reason,
          isL2: true,
        });
        await sendMail({
          to: hr.email,
          ...template,
          mailType: "APPROVAL_REQUEST",
          leaveRequestId: leaveId,
        }).catch(console.error);
      }
      break;
    }

    case "APPROVED": {
      // Send approval result to requester
      const resultTemplate = approvalResultTemplate({
        requesterName: leave.user.name,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        status: "APPROVED",
      });
      await sendMail({
        to: leave.user.email,
        ...resultTemplate,
        mailType: "APPROVAL_RESULT",
        leaveRequestId: leaveId,
      }).catch(console.error);

      // If proxy, also notify employee
      if (leave.isProxy && leave.registeredBy.id !== leave.user.id) {
        const proxyTemplate = proxyLeaveNotificationTemplate({
          employeeName: leave.user.name,
          adminName: leave.registeredBy.name,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days,
          reason: leave.reason,
        });
        await sendMail({
          to: leave.user.email,
          ...proxyTemplate,
          mailType: "PROXY_LEAVE_NOTIFICATION",
          leaveRequestId: leaveId,
        }).catch(console.error);
      }

      // Sync to calendar
      await syncLeaveToCalendar(leaveId);
      break;
    }

    case "REJECTED_L1":
    case "REJECTED_L2": {
      const rejectReason =
        newStatus === "REJECTED_L1" ? leave.l1RejectReason : leave.l2RejectReason;
      const resultTemplate = approvalResultTemplate({
        requesterName: leave.user.name,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        status: newStatus,
        rejectReason,
      });
      await sendMail({
        to: leave.user.email,
        ...resultTemplate,
        mailType: "APPROVAL_RESULT",
        leaveRequestId: leaveId,
      }).catch(console.error);
      break;
    }

    case "CANCELLED": {
      // Delete calendar event
      await deleteLeaveFromCalendar(leaveId);
      break;
    }
  }
}
