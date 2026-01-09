export default function DebugPage() {
    return (
        <div style={{ padding: '20px', background: 'white', color: 'black' }}>
            <h1>Debug Page</h1>
            <p>If you can see this, Next.js rendering is working.</p>
            <ul style={{ marginTop: '10px' }}>
                <li>Path: /debug</li>
                <li>Environment: Development</li>
            </ul>
        </div>
    );
}
