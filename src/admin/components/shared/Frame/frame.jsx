function Frame({ children }) {

  return (
    <div className='relative font-sans flex h-full bg-white rounded-lg w-full '>
      {children}
    </div>
  );
}

export default Frame