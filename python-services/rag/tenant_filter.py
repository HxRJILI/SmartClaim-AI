"""
Tenant Filter Manager for Multi-Tenant RAG System
Enforces strict role-based data isolation at the retrieval level
"""

from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny
import logging

logger = logging.getLogger(__name__)


class UserRole(str, Enum):
    """User roles in SmartClaim"""
    ADMIN = "admin"
    DEPARTMENT_MANAGER = "department_manager"
    WORKER = "worker"


class UserContext(BaseModel):
    """User context for tenant isolation"""
    user_id: str
    role: UserRole
    department_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class TenantFilterManager:
    """
    Manages tenant-based filtering for multi-tenant RAG queries.
    
    Access Control Model:
    - Admin: Full system access (all departments, all tickets, all users)
    - Department Manager: Access limited to their assigned department's tickets
    - Worker: Access limited to tickets they personally created
    
    CRITICAL: Filters are applied BEFORE similarity search (pre-filtering)
    to ensure no unauthorized data is ever retrieved.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.TenantFilterManager")
    
    def build_filter(self, user_context: UserContext) -> Optional[Filter]:
        """
        Build Qdrant filter based on user role and context.
        
        Pre-filtering ensures that:
        1. Vector search only happens on authorized documents
        2. No data leakage is possible
        3. Performance is optimized by reducing search space
        
        Args:
            user_context: User information including role and IDs
            
        Returns:
            Qdrant Filter object or None for unrestricted access
        """
        role = UserRole(user_context.role) if isinstance(user_context.role, str) else user_context.role
        
        self.logger.info(f"Building filter for user {user_context.user_id} with role {role}")
        
        if role == UserRole.ADMIN:
            return self._build_admin_filter(user_context)
        elif role == UserRole.DEPARTMENT_MANAGER:
            return self._build_manager_filter(user_context)
        elif role == UserRole.WORKER:
            return self._build_worker_filter(user_context)
        else:
            # Default to most restrictive - worker filter
            self.logger.warning(f"Unknown role {role}, defaulting to worker filter")
            return self._build_worker_filter(user_context)
    
    def _build_admin_filter(self, user_context: UserContext) -> Optional[Filter]:
        """
        Admin has full system access - no filtering required.
        
        Scope: system_wide = true
        Can retrieve: ALL tickets, ALL comments, ALL departments
        """
        self.logger.info(f"Admin access granted for user {user_context.user_id}")
        return None  # No filter = full access
    
    def _build_manager_filter(self, user_context: UserContext) -> Filter:
        """
        Department Manager can only access their department's tickets.
        
        Scope: department_id = <manager's department UUID>
        Can retrieve: Tickets WHERE assigned_to_department = user's department_id
        """
        if not user_context.department_id:
            self.logger.error(f"Department manager {user_context.user_id} has no department_id!")
            # Return impossible filter to prevent any access
            return Filter(
                must=[
                    FieldCondition(
                        key="department_id",
                        match=MatchValue(value="__IMPOSSIBLE_MATCH__")
                    )
                ]
            )
        
        self.logger.info(
            f"Department filter applied for manager {user_context.user_id}: "
            f"department_id={user_context.department_id}"
        )
        
        return Filter(
            must=[
                FieldCondition(
                    key="department_id",
                    match=MatchValue(value=user_context.department_id)
                )
            ]
        )
    
    def _build_worker_filter(self, user_context: UserContext) -> Filter:
        """
        Worker can only access tickets they created.
        
        Scope: user_id = <worker's UUID>
        Can retrieve: Tickets WHERE created_by = user's id
        """
        self.logger.info(f"Worker filter applied for user {user_context.user_id}")
        
        return Filter(
            must=[
                FieldCondition(
                    key="created_by",
                    match=MatchValue(value=user_context.user_id)
                )
            ]
        )
    
    def validate_access(
        self, 
        user_context: UserContext, 
        document_metadata: Dict[str, Any]
    ) -> bool:
        """
        Validate if user has access to a specific document.
        Used as a secondary check after retrieval.
        
        Args:
            user_context: User information
            document_metadata: Document metadata to check
            
        Returns:
            True if access is allowed, False otherwise
        """
        role = UserRole(user_context.role) if isinstance(user_context.role, str) else user_context.role
        
        if role == UserRole.ADMIN:
            return True
        
        if role == UserRole.DEPARTMENT_MANAGER:
            doc_dept = document_metadata.get("department_id")
            if doc_dept == user_context.department_id:
                return True
            self.logger.warning(
                f"Access denied: Manager {user_context.user_id} tried to access "
                f"document from department {doc_dept}"
            )
            return False
        
        if role == UserRole.WORKER:
            doc_creator = document_metadata.get("created_by")
            if doc_creator == user_context.user_id:
                return True
            self.logger.warning(
                f"Access denied: Worker {user_context.user_id} tried to access "
                f"document created by {doc_creator}"
            )
            return False
        
        return False
    
    def filter_results(
        self, 
        user_context: UserContext, 
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Post-retrieval filter as an additional security layer.
        Should not be needed if pre-filtering works correctly,
        but provides defense in depth.
        
        Args:
            user_context: User information
            results: Retrieved documents
            
        Returns:
            Filtered list of authorized documents
        """
        filtered = []
        for result in results:
            metadata = result.get("metadata", result)
            if self.validate_access(user_context, metadata):
                filtered.append(result)
            else:
                self.logger.warning(
                    f"Post-filter removed unauthorized document for user {user_context.user_id}"
                )
        
        if len(filtered) < len(results):
            self.logger.error(
                f"Post-filtering removed {len(results) - len(filtered)} unauthorized documents! "
                f"This indicates a pre-filter failure."
            )
        
        return filtered


# Singleton instance
tenant_filter_manager = TenantFilterManager()
