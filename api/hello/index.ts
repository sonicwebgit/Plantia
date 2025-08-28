export async function GET(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ 
    message: "Hello World - API is working!",
    timestamp: new Date().toISOString(),
    status: "success"
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ 
    message: "POST request received",
    timestamp: new Date().toISOString(),
    status: "success"
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}