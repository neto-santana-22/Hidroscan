from django.urls import path
from hidroscan.views import index

urlpatterns = [
    path('', index)
]