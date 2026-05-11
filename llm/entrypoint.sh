#!/bin/sh
set -eu

cmd="vllm serve $MODEL"
cmd="$cmd --host 0.0.0.0 --port 8000"
cmd="$cmd --max-model-len ${MAX_MODEL_LEN:-8192}"
cmd="$cmd --gpu-memory-utilization ${GPU_MEMORY_UTILIZATION:-0.92}"
[ -n "${VLLM_API_KEY:-}" ] && cmd="$cmd --api-key $VLLM_API_KEY"
[ -n "${SERVED_MODEL_NAME:-}" ] && cmd="$cmd --served-model-name $SERVED_MODEL_NAME"
[ -n "${QUANTIZATION:-}" ] && cmd="$cmd --quantization $QUANTIZATION"
[ -n "${TOKENIZER_MODE:-}" ] && cmd="$cmd --tokenizer-mode $TOKENIZER_MODE"
[ -n "${CONFIG_FORMAT:-}" ] && cmd="$cmd --config-format $CONFIG_FORMAT"
[ -n "${LOAD_FORMAT:-}" ] && cmd="$cmd --load-format $LOAD_FORMAT"

echo "Executing: $cmd"
exec $cmd
