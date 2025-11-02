function Frame() {
  // place-holder store admin user name
  const username = "Admin"

  return (
    <div className='font-mono flex h-full bg-white rounded-lg w-full'>
      <div className='m-10 font-bold text-2xl'>
        <h2>Welcome, {username}</h2>
      </div>
      <p></p>
    </div>
  );
}

export default Frame