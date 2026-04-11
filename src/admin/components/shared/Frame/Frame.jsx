function Frame({ children }) {

  return (
    <div className='relative font-sans flex h-full bg-white rounded-lg shadow-inner w-full overflow-auto'>
      {children}
    </div>
  );
}

export default Frame