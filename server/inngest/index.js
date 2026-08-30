import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create Inngest client
export const inngest = new Inngest({
  id: "Project-Mgt1592006",
});

// ============================================================
// USER CREATION
// ============================================================
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [
      {
        event: "clerk/user.created",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    const email = data.email_addresses?.[0]?.email_address;

    if (!email) {
      throw new Error("User email is missing from Clerk event");
    }

    await prisma.user.create({
      data: {
        id: data.id,
        email,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        image: data.image_url || "",
      },
    });
  }
);

// ============================================================
// USER DELETION
// ============================================================
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: [
      {
        event: "clerk/user.deleted",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// ============================================================
// USER UPDATE
// ============================================================
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [
      {
        event: "clerk/user.updated",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data.email_addresses?.[0]?.email_address,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        image: data.image_url || "",
      },
    });
  }
);

// ============================================================
// WORKSPACE CREATION
// ============================================================
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: [
      {
        event: "clerk/organization.created",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    // Add creator as ADMIN member
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

// ============================================================
// WORKSPACE UPDATE
// ============================================================
const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "update-workspace-from-clerk",
    triggers: [
      {
        event: "clerk/organization.updated",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  }
);

// ============================================================
// WORKSPACE DELETION
// ============================================================
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace-with-clerk",
    triggers: [
      {
        event: "clerk/organization.deleted",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// ============================================================
// WORKSPACE MEMBER CREATION
// ============================================================
const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
    triggers: [
      {
        event: "clerk/organizationInvitation.accepted",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  }
);

// ============================================================
// TASK ASSIGNMENT EMAIL + REMINDER
// ============================================================
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [
      {
        event: "app/task.assigned",
      },
    ],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        assignee: true,
        project: true,
      },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.assignee) {
      throw new Error(`Task assignee not found for task: ${taskId}`);
    }

    // ========================================================
    // SEND ASSIGNMENT EMAIL
    // ========================================================
    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assignment in ${task.project.name}`,
      body: `
        <div style="max-width: 600px;">
          <h2>Hi ${task.assignee.name},</h2>

          <p style="font-size: 16px;">
            You've been assigned a new task:
          </p>

          <p style="
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            margin: 8px 0;
          ">
            ${task.title}
          </p>

          <div style="
            border: 1px solid #ddd;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 30px;
          ">
            <p style="margin: 6px 0;">
              <strong>Description:</strong> ${task.description}
            </p>

            <p style="margin: 6px 0;">
              <strong>Due Date:</strong>
              ${new Date(task.due_date).toLocaleDateString()}
            </p>
          </div>

          <a
            href="${origin}"
            style="
              background-color: #007bff;
              padding: 12px 24px;
              border-radius: 5px;
              color: #fff;
              font-weight: 600;
              font-size: 16px;
              text-decoration: none;
            "
          >
            View Task
          </a>

          <p style="
            margin-top: 20px;
            font-size: 14px;
            color: #6c757d;
          ">
            Please make sure to review and complete it before the due date.
          </p>
        </div>
      `,
    });

    // ========================================================
    // CHECK DUE DATE
    // ========================================================
    const dueDate = new Date(task.due_date);
    const today = new Date();

    if (dueDate > today) {
      await step.sleepUntil("wait-for-the-due-date", dueDate);

      await step.run("check-if-task-is-completed", async () => {
        const updatedTask = await prisma.task.findUnique({
          where: {
            id: taskId,
          },
          include: {
            assignee: true,
            project: true,
          },
        });

        if (!updatedTask) {
          return;
        }

        if (
          updatedTask.status !== "DONE" &&
          updatedTask.assignee
        ) {
          await sendEmail({
            to: updatedTask.assignee.email,
            subject: `Reminder for ${updatedTask.project.name}`,
            body: `
              <div style="max-width: 600px;">
                <h2>Hi ${updatedTask.assignee.name},</h2>

                <p style="font-size: 16px;">
                  You have a task due in ${updatedTask.project.name}:
                </p>

                <p style="
                  font-size: 18px;
                  font-weight: bold;
                  color: #007bff;
                  margin: 8px 0;
                ">
                  ${updatedTask.title}
                </p>

                <div style="
                  border: 1px solid #ddd;
                  padding: 12px 16px;
                  border-radius: 6px;
                  margin-bottom: 30px;
                ">
                  <p style="margin: 6px 0;">
                    <strong>Description:</strong>
                    ${updatedTask.description}
                  </p>

                  <p style="margin: 6px 0;">
                    <strong>Due Date:</strong>
                    ${new Date(
                      updatedTask.due_date
                    ).toLocaleDateString()}
                  </p>
                </div>

                <a
                  href="${origin}"
                  style="
                    background-color: #007bff;
                    padding: 12px 24px;
                    border-radius: 5px;
                    color: #fff;
                    font-weight: 600;
                    font-size: 16px;
                    text-decoration: none;
                  "
                >
                  View Task
                </a>

                <p style="
                  margin-top: 20px;
                  font-size: 14px;
                  color: #6c757d;
                ">
                  Please make sure to review and complete it before the due date.
                </p>
              </div>
            `,
          });
        }
      });
    }
  }
);

// ============================================================
// EXPORT FUNCTIONS
// ============================================================
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail,
];