from collections import defaultdict
from django.db import migrations


def normalize_existing_emails(apps, schema_editor):
    User = apps.get_model("accounts", "User")

    # 1. Agrupar e-mails por sua versão normalizada (caixa baixa)
    email_groups = defaultdict(list)
    for user in User.objects.all():
        raw_email = user.email.strip()
        normalized = raw_email.lower()
        email_groups[normalized].append((user.pk, raw_email))

    # 2. Identificar se existem colisões (dois ou mais usuários com variações de caixa)
    collisions = {
        norm: [f"ID {pk}: '{raw}'" for pk, raw in entries]
        for norm, entries in email_groups.items()
        if len(entries) > 1
    }

    if collisions:
        collision_details = "; ".join(
            f"'{norm}' -> [{', '.join(details)}]"
            for norm, details in collisions.items()
        )
        raise RuntimeError(
            "Migração abortada: foram encontrados usuários distintos cujos e-mails diferem apenas "
            f"por maiúsculas/minúsculas, o que violaria a restrição de unicidade: {collision_details}. "
            "Unifique ou corrija os e-mails conflitantes antes de aplicar esta migração."
        )

    # 3. Aplicar a normalização caso não haja colisões
    for user in User.objects.all():
        normalized = user.email.strip().lower()
        if user.email != normalized:
            user.email = normalized
            user.save(update_fields=["email"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            normalize_existing_emails,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
