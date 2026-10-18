from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.transactions.models import TransactionCategory
from apps.users.permissions import IsFullyAuthenticated

from .services.purchase_check import check_purchase


class PurchaseCheckRequestSerializer(serializers.Serializer):
    item = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("1000000")
    )
    category = serializers.ChoiceField(choices=TransactionCategory.choices)


class PurchaseCheckView(APIView):
    """
    POST /api/purchase-check/  body: { "item"?: str, "amount": decimal, "category": str }

    Read-only estimate of how a prospective purchase fits the user, from their own
    history in that category. Nothing is persisted.
    """

    permission_classes = [IsFullyAuthenticated]

    def post(self, request):
        ser = PurchaseCheckRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        return Response(
            check_purchase(
                request.user,
                amount=data["amount"],
                category=data["category"],
                item=data["item"].strip(),
            )
        )
