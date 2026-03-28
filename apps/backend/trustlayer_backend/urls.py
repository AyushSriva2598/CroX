from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/contracts/', include('contracts.urls')),
    path('api/escrow/', include('escrow.urls')),
    path('api/disputes/', include('disputes.urls')),
    path('api/ai/', include('ai_service.urls')),
    path('api/blockchain/', include('blockchain.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
