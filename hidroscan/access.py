from django.db.models import QuerySet

from accounts.models import User

from .models import Property, RegionAccess


def imoveis_visiveis(usuario) -> QuerySet[Property]:
    if not usuario.is_authenticated:
        return Property.objects.none()
    if usuario.role == User.Role.ADMINISTRADOR:
        return Property.objects.all()
    if usuario.role == User.Role.MORADOR:
        return Property.objects.filter(owner=usuario)
    if usuario.todas_regioes:
        return Property.objects.all()
    region_ids = RegionAccess.objects.filter(user=usuario).values("region_id")
    return Property.objects.filter(region_id__in=region_ids)
