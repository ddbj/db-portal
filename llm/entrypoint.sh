#!/bin/sh
set -eu

cmd="vllm serve $LLM_MODEL"
cmd="$cmd --host 0.0.0.0 --port 8000"
cmd="$cmd --max-model-len ${LLM_MAX_MODEL_LEN:-8192}"
cmd="$cmd --gpu-memory-utilization ${LLM_GPU_MEMORY_UTILIZATION:-0.92}"
[ -n "${LLM_API_KEY:-}" ] && cmd="$cmd --api-key $LLM_API_KEY"
[ -n "${LLM_SERVED_MODEL_NAME:-}" ] && cmd="$cmd --served-model-name $LLM_SERVED_MODEL_NAME"
[ -n "${LLM_QUANTIZATION:-}" ] && cmd="$cmd --quantization $LLM_QUANTIZATION"
[ -n "${LLM_TOKENIZER_MODE:-}" ] && cmd="$cmd --tokenizer-mode $LLM_TOKENIZER_MODE"
[ -n "${LLM_CONFIG_FORMAT:-}" ] && cmd="$cmd --config-format $LLM_CONFIG_FORMAT"
[ -n "${LLM_LOAD_FORMAT:-}" ] && cmd="$cmd --load-format $LLM_LOAD_FORMAT"

echo "Executing: $cmd"
exec $cmd
