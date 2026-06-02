#!/bin/sh
set -eu

cmd="vllm serve $DB_PORTAL_LLM_MODEL"
cmd="$cmd --host 0.0.0.0 --port 8000"
cmd="$cmd --max-model-len ${DB_PORTAL_LLM_MAX_MODEL_LEN:-8192}"
cmd="$cmd --gpu-memory-utilization ${DB_PORTAL_LLM_GPU_MEMORY_UTILIZATION:-0.92}"
[ -n "${DB_PORTAL_LLM_API_KEY:-}" ] && cmd="$cmd --api-key $DB_PORTAL_LLM_API_KEY"
[ -n "${DB_PORTAL_LLM_SERVED_MODEL_NAME:-}" ] && cmd="$cmd --served-model-name $DB_PORTAL_LLM_SERVED_MODEL_NAME"
[ -n "${DB_PORTAL_LLM_QUANTIZATION:-}" ] && cmd="$cmd --quantization $DB_PORTAL_LLM_QUANTIZATION"
[ -n "${DB_PORTAL_LLM_TOKENIZER_MODE:-}" ] && cmd="$cmd --tokenizer-mode $DB_PORTAL_LLM_TOKENIZER_MODE"
[ -n "${DB_PORTAL_LLM_CONFIG_FORMAT:-}" ] && cmd="$cmd --config-format $DB_PORTAL_LLM_CONFIG_FORMAT"
[ -n "${DB_PORTAL_LLM_LOAD_FORMAT:-}" ] && cmd="$cmd --load-format $DB_PORTAL_LLM_LOAD_FORMAT"

echo "Executing: $cmd"
exec $cmd
