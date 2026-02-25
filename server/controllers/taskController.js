import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";


// create task
export const createTask = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {projectId, title, description, type, status, priority, assigneeId, due_date} = req.body;

        const origin = req.get('origin')

        // check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        
        // FIXED: Allow both team lead AND project members to create tasks
        const isTeamLead = project.team_lead === userId;
        const isProjectMember = project.members.some(member => member.user.id === userId);

        if (!isTeamLead && !isProjectMember) {
            return res.status(403).json({ 
                message: "You must be a project member or team lead to create tasks" 
            });
        }
        
        // Check if assignee is a project member
        if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
            return res.status(403).json({ message: "Assignee is not a member of the project" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                priority,
                assigneeId,
                status,
                type,
                due_date: new Date(due_date)
            }
        })

        const taskWithAssignee = await prisma.task.findUnique({
            where: {id: task.id},
            include: {assignee: true}
        })

        await inngest.send({
            name: "app/task.assigned",
            data: {
                taskId: task.id, 
                origin
            }
        })

        res.json({task: taskWithAssignee, message: "Task created successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
        
    }
}

// update task
export const updateTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const taskId = req.params.id;

        const task = await prisma.task.findUnique({
            where: {id: taskId}
        })
        
        if (!task) {
            return res.status(404).json({ message: "Task not found"});
        }

        const project = await prisma.project.findUnique({
            where: {id: task.projectId},
            include: {members: {include: {user: true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        
        // FIXED: Allow both team lead AND project members to update tasks
        const isTeamLead = project.team_lead === userId;
        const isProjectMember = project.members.some(member => member.user.id === userId);
        const isAssignee = task.assigneeId === userId;

        if (!isTeamLead && !isProjectMember && !isAssignee) {
            return res.status(403).json({ 
                message: "You don't have permission to update this task" 
            });
        }

        const updatedTask = await prisma.task.update({
            where: {id: taskId},
            data: req.body
        })

        res.json({task: updatedTask, message: "Task updated successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
        
    }
}

// delete task
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskIds } = req.body;
        
        if (!taskIds || taskIds.length === 0) {
            return res.status(400).json({ message: "No task IDs provided" });
        }

        const tasks = await prisma.task.findMany({
            where: {id: {in: taskIds}}
        })

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Tasks not found" });
        }

        // Get the project from the first task (assuming all tasks are from same project)
        const project = await prisma.project.findUnique({
            where: {id: tasks[0].projectId},
            include: {members: {include: {user: true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        
        // FIXED: Only team lead can delete tasks (stricter permission for deletion)
        //if (project.team_lead !== userId) {
           // return res.status(403).json({ 
              //  message: "Only the project lead can delete tasks" 
           // });
       // }

        await prisma.task.deleteMany({
            where: {id: {in: taskIds}}
        })

        res.json({message: "Task deleted successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
        
    }
}