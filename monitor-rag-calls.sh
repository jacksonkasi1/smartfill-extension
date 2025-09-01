#!/bin/bash

echo "🔍 Starting RAG API Call Monitor..."
echo "📡 Monitoring localhost:3001 for RAG service calls"
echo "⏰ Started at: $(date)"
echo "======================================================"

# Monitor network connections to port 3001
echo "🌐 Monitoring network connections to port 3001..."
lsof -i :3001 -r 2 &
LSOF_PID=$!

# Monitor HTTP requests using netstat
echo "📊 Monitoring HTTP requests..."
netstat -an | grep :3001 &

# Monitor process logs if RAG service is running
echo "📝 Monitoring RAG service logs..."
if pgrep -f "rag-service" > /dev/null; then
    echo "✅ RAG service process found"
    # Follow the logs in background
    tail -f /dev/null & # Placeholder - actual logs would need to be specified
else
    echo "⚠️  RAG service process not found"
fi

echo ""
echo "🎯 TEST INSTRUCTIONS:"
echo "1. Open Chrome and load the SmartFill extension"
echo "2. Navigate to the test form (test-form.html)"
echo "3. Click 'Fill Forms' button"
echo "4. Watch this monitor for API calls"
echo ""
echo "🔍 What to look for:"
echo "   - Network connections to localhost:3001"
echo "   - POST requests to /api/v1/knowledge/query"
echo "   - Console logs in browser DevTools"
echo ""
echo "Press Ctrl+C to stop monitoring..."

# Keep the script running
trap "echo 'Stopping monitors...'; kill $LSOF_PID 2>/dev/null; exit 0" INT
wait