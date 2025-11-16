exports.handler = async () => {
  try {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { id: 'general-admission', name: 'General Admission Ticket' }
      ]),
    };
  } catch (error) {
    console.error('GET EVENTS ERROR:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
