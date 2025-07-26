{{/*the domain name of aiproxy server*/}}
{{- define "fastgpt.aiproxyURI" -}}
{{- printf "http://aiproxy.%s:3000" .Release.Namespace -}}
{{- end -}}

{{/*the domain name of mongo server*/}}
{{- define "fastgpt.mongoURI" -}}
{{- printf "mongodb://root:Y8NCooVsPw@mongodb-cluster-replica-0-0-svc.%s:27017/fastgpt?authSource=admin" .Release.Namespace -}}
{{- end -}}

{{/*the domain name of pgvector server*/}}
{{- define "fastgpt.pgvectorURI" -}}
{{- printf "postgresql://username:password@pgvector.%s:5432/postgres" .Release.Namespace -}}
{{- end -}}

{{/*the domain name of redis server*/}}
{{- define "fastgpt.redisURI" -}}
{{- printf "redis://admin:L7QxYIGC@cluster-redis-leader.%s:6379" .Release.Namespace -}}
{{- end -}}

{{/*the domain name of sandbox server*/}}
{{- define "fastgpt.sandboxURI" -}}
{{- printf "http://sandbox.%s:3000" .Release.Namespace -}}
{{- end -}}

{{/*the domain name of fastgpt-pro server*/}}
{{- define "fastgpt.fastgptProURI" -}}
{{- printf "http://fastgptpro.%s:3000" .Release.Namespace -}}
{{- end -}}