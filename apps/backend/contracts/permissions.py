from rest_framework import permissions


class IsContractParty(permissions.BasePermission):
    """Only allow payer or payee of a contract to access it."""
    def has_object_permission(self, request, view, obj):
        return obj.payer == request.user or obj.payee == request.user


class IsPayer(permissions.BasePermission):
    """Only allow payer of a contract."""
    def has_object_permission(self, request, view, obj):
        return obj.payer == request.user


class IsPayee(permissions.BasePermission):
    """Only allow payee of a contract."""
    def has_object_permission(self, request, view, obj):
        return obj.payee == request.user
