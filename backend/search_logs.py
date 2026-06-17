import json
import os

log_path = r'C:\Users\LENOVO\.gemini\antigravity\brain\094771f5-613e-4075-bba2-fb4094a1dbef\.system_generated\logs\transcript_full.jsonl'
log_path = log_path if os.path.exists(log_path) else r'C:\Users\LENOVO\.gemini\antigravity\brain\094771f5-613e-4075-bba2-fb4094a1dbef\.system_generated\logs\transcript.jsonl'
output_path = 'scratch/login_history_full.txt'
os.makedirs('scratch', exist_ok=True)

with open(log_path, 'r', encoding='utf-8') as f, open(output_path, 'w', encoding='utf-8') as out:
    for line in f:
        try:
            data = json.loads(line)
            # Look for step type that contains tool calls for Login.jsx editing
            tool_calls = data.get('tool_calls', [])
            for tc in tool_calls:
                args = tc.get('args', {})
                target = args.get('TargetFile', '') or args.get('Target', '')
                if 'Login.jsx' in target:
                    out.write(f"=== STEP {data.get('step_index')} ({data.get('created_at')}) ===\n")
                    out.write(f"Tool: {tc.get('name')}\n")
                    out.write(f"Description: {args.get('Description')}\n")
                    out.write(f"Content:\n{args.get('ReplacementContent') or args.get('CodeContent')}\n\n")
        except Exception as e:
            pass

print("Search completed. Output written to scratch/login_history.txt")
