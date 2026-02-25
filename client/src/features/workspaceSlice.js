import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { dummyWorkspaces } from "../assets/assets";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces', async ({getToken}, {rejectWithValue}) => {
    try {
        const {data} = await api.get('/api/workspaces', {
            headers: {
                Authorization: `Bearer ${await getToken()}`
            }
        });
        return data.workspaces || [];
    } catch (error) {
        console.log(error?.response?.data?.message || error.message);
        // Return rejectWithValue instead of empty array to handle errors properly
        return rejectWithValue(error?.response?.data?.message || error.message);
    }
});

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
    error: null, // Add error state for better error handling
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);

            // set current workspace to the new workspace
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );

            // if current workspace is updated, set it to the updated workspace
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w._id !== action.payload);
            
            // Update current workspace if deleted
            if (state.currentWorkspace?._id === action.payload) {
                state.currentWorkspace = state.workspaces[0] || null;
                if (state.currentWorkspace) {
                    localStorage.setItem("currentWorkspaceId", state.currentWorkspace.id);
                } else {
                    localStorage.removeItem("currentWorkspaceId");
                }
            }
        },
        addProject: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects.push(action.payload);
                // find workspace by id and add project to it
                state.workspaces = state.workspaces.map((w) =>
                    w.id === state.currentWorkspace.id ? { ...w, projects: [...(w.projects || []), action.payload] } : w
                );
            }
        },
        addTask: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks = [...(p.tasks || []), action.payload];
                    }
                    return p;
                });

                // find workspace and project by id and add task to it
                state.workspaces = state.workspaces.map((w) =>
                    w.id === state.currentWorkspace.id ? {
                        ...w, projects: w.projects.map((p) =>
                            p.id === action.payload.projectId ? { 
                                ...p, 
                                tasks: [...(p.tasks || []), action.payload] 
                            } : p
                        )
                    } : w
                );
            }
        },
        updateTask: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks = p.tasks.map((t) =>
                            t.id === action.payload.id ? action.payload : t
                        );
                    }
                    return p;
                });
                
                // find workspace and project by id and update task in it
                state.workspaces = state.workspaces.map((w) =>
                    w.id === state.currentWorkspace.id ? {
                        ...w, projects: w.projects.map((p) =>
                            p.id === action.payload.projectId ? {
                                ...p, tasks: p.tasks.map((t) =>
                                    t.id === action.payload.id ? action.payload : t
                                )
                            } : p
                        )
                    } : w
                );
            }
        },
        deleteTask: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks = p.tasks.filter((t) => !action.payload.taskIds?.includes(t.id));
                    }
                    return p;
                });
                
                // find workspace and project by id and delete task from it
                state.workspaces = state.workspaces.map((w) =>
                    w.id === state.currentWorkspace.id ? {
                        ...w, projects: w.projects.map((p) =>
                            p.id === action.payload.projectId ? {
                                ...p, 
                                tasks: p.tasks.filter((t) => !action.payload.taskIds?.includes(t.id))
                            } : p
                        )
                    } : w
                );
            }
        }
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchWorkspaces.pending, (state)=>{
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchWorkspaces.fulfilled, (state, action)=>{
            state.workspaces = action.payload;
            if (action.payload.length > 0) {
                const localStorageCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
                if (localStorageCurrentWorkspaceId) {
                    const findWorkspace = action.payload.find((w)=> w.id === localStorageCurrentWorkspaceId);
                    if (findWorkspace) {
                        state.currentWorkspace = findWorkspace;
                    } else {
                        state.currentWorkspace = action.payload[0];
                        localStorage.setItem('currentWorkspaceId', action.payload[0].id);
                    }
                } else {
                    state.currentWorkspace = action.payload[0];
                    localStorage.setItem('currentWorkspaceId', action.payload[0].id);
                }
            } else {
                state.currentWorkspace = null;
                localStorage.removeItem('currentWorkspaceId');
            }
            state.loading = false;
        });
        builder.addCase(fetchWorkspaces.rejected, (state, action)=>{
            state.loading = false;
            state.error = action.payload || 'Failed to fetch workspaces';
            state.workspaces = []; // Ensure workspaces is empty on error
        });    
    }
});

export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;