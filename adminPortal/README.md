
  # Media Processing Admin Portal

  This is a code bundle for Media Processing Admin Portal. The original project is available at https://www.figma.com/design/gObtSx4sQL3trXN7xPU7ln/Media-Processing-Admin-Portal.

  ## Running the code

Run `npm i` to install the dependencies.

Create a `.env` file (or copy `.env.example`) to configure the backend API URL:

```
VITE_BACKEND_URL=http://localhost:4000
```

Run `npm run dev` to start the development server.

The login page now calls the backend `POST /auth/super-admin/login` endpoint. After a successful sign in you can manage users via the `/users` APIs directly from the Users tab (fetch, create).
  
