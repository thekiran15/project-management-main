import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganizationList } from "@clerk/clerk-react";

function WorkspaceDropdown() {
    const { setActive, userMemberships, isLoaded } = useOrganizationList({
        userMemberships: true
    });

    const { openCreateOrganization } = useClerk();

    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = (organization) => {
        if (setActive && organization) {
            setActive({ organization: organization.id });
        }
        // Dispatch with the workspace ID from your Redux store
        // You might need to find the matching workspace in your Redux store
        const workspaceToSelect = workspaces.find(w => w.id === organization.id);
        if (workspaceToSelect) {
            dispatch(setCurrentWorkspace(organization.id));
        }
        setIsOpen(false);
        navigate('/');
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Set active organization when currentWorkspace changes
    useEffect(() => {
        if (currentWorkspace && isLoaded && setActive) {
            setActive({ organization: currentWorkspace.id });
        }
    }, [currentWorkspace, isLoaded, setActive]);

    // Get organization image URL - Clerk uses different property names
    const getOrganizationImage = (org) => {
        // Try different possible property names for the image
        return org?.imageUrl || org?.image_url || org?.logoUrl || org?.logo || null;
    };

    // Get organization name
    const getOrganizationName = (org) => {
        return org?.name || 'Unnamed Workspace';
    };

    // Loading state
    if (!isLoaded) {
        return (
            <div className="m-4 p-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                    <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mb-1" />
                        <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(prev => !prev)} 
                className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                disabled={!currentWorkspace}
            >
                <div className="flex items-center gap-3">
                    {currentWorkspace?.image_url ? (
                        <img 
                            src={currentWorkspace.image_url} 
                            alt={currentWorkspace.name} 
                            className="w-8 h-8 rounded shadow" 
                        />
                    ) : (
                        <div className="w-8 h-8 rounded shadow bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {currentWorkspace?.name?.charAt(0) || 'W'}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0 mt-1 max-h-96 overflow-y-auto">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {userMemberships?.data?.length > 0 ? (
                            userMemberships.data.map((membership) => {
                                // Get the organization from the membership
                                const org = membership.organization || membership;
                                const imageUrl = getOrganizationImage(org);
                                const orgName = getOrganizationName(org);
                                const orgId = org.id;
                                
                                return (
                                    <div 
                                        key={orgId} 
                                        onClick={() => onSelectWorkspace(org)} 
                                        className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    >
                                        {imageUrl ? (
                                            <img 
                                                src={imageUrl} 
                                                alt={orgName} 
                                                className="w-6 h-6 rounded object-cover"
                                                onError={(e) => {
                                                    // If image fails to load, show fallback
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML += `
                                                        <div class="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                            ${orgName.charAt(0)}
                                                        </div>
                                                    `;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {orgName.charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                {orgName}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                                {org.membersCount || membership.membersCount || 0} members
                                            </p>
                                        </div>
                                        {currentWorkspace?.id === orgId && (
                                            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-zinc-400 p-2 text-center">
                                No workspaces found
                            </p>
                        )}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div 
                        onClick={() => { 
                            openCreateOrganization(); 
                            setIsOpen(false); 
                        }} 
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;