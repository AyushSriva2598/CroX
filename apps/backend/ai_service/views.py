from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .orchestrator import orchestrate_contract_analysis


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_contract_view(request):
    """
    Multi-agent contract analysis endpoint.
    
    Input: {"text": "I want to hire someone for ₹50,000 to build a website..."}
    Output: Results from all 3 agents + final structured contract
    """
    text = request.data.get('text', '')
    if not text:
        return Response(
            {'error': 'Please provide contract description in "text" field'},
            status=status.HTTP_400_BAD_REQUEST
        )

    results = orchestrate_contract_analysis(text)
    return Response(results, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def parse_contract_demo(request):
    """
    Demo endpoint — same as above but no auth required.
    For testing/demo purposes.
    """
    text = request.data.get('text', '')
    if not text:
        return Response(
            {'error': 'Please provide contract description in "text" field'},
            status=status.HTTP_400_BAD_REQUEST
        )

    results = orchestrate_contract_analysis(text)
    return Response(results, status=status.HTTP_200_OK)
