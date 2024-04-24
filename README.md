Here's how I built an in-browser PDF compressor using Typescript 👇

I basically extracted images from the PDF, compressed them, and then replaced them within the PDF file using pdf-lib(https://pdf-lib.js.org). Although pdf-lib lacks direct functions for this, I found solutions by exploring its GitHub issues.

I used HTML Canvas, loaded each image onto the canvas and used HTMLCanvasElement: toDataURL() function for image compression. This might not be the best way to compress an image but its good for a starting point.

Used Antd components for file upload, button and some CSS stuff for beautification

You can try the PDF compressor here: https://pdf-compressor-vercel.vercel.app

## You can spin up your local setup by following the steps below

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.



