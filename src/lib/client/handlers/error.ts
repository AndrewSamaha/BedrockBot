const error = {
  name: 'error' as const,
  fn: (err: any) => {
    console.error('Client error:', err);
  }
};

export default error;