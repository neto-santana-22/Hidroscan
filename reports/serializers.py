from rest_framework import serializers


class ReportQuerySerializer(serializers.Serializer):
    formato = serializers.ChoiceField(choices=["csv", "pdf"])
    imovel = serializers.IntegerField(required=False, min_value=1)
    regiao = serializers.IntegerField(required=False, min_value=1)
    inicio = serializers.DateTimeField(required=False)
    fim = serializers.DateTimeField(required=False)
    status = serializers.CharField(required=False, max_length=30)

    def validate(self, attrs):
        if attrs.get("inicio") and attrs.get("fim") and attrs["inicio"] > attrs["fim"]:
            raise serializers.ValidationError("'inicio' deve ser anterior ou igual a 'fim'.")
        return attrs
