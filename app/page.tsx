"use client"
import React, { useState } from 'react';
import { PDFDocument, PDFName, PDFRawStream, PDFObject, PDFRef, PDFContext } from 'pdf-lib';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Button, message, Upload } from 'antd';
const { Dragger } = Upload;

interface ImageObject {
	ref: PDFRef,
	smaskRef: PDFRef,
	type: string,
	width: number,
	height: number,
	name: string,
	data: Uint8Array,
	bitsPerComponent: number,
	colorSpace: PDFRef
}

interface LoadedImages {
	[key: number]: HTMLImageElement;
}

function getMimeTypeFromExtension(imageType: string) {
	const extension = imageType
	switch (extension) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'gif':
			return 'image/gif';
		case 'bmp':
			return 'image/bmp';
		case 'webp':
			return 'image/webp';
		case 'svg':
			return 'image/svg+xml';
		default:
			return '';
	}
}

const imagesLoaded = async (imagesInDoc: ImageObject[], loadedImages: LoadedImages, pdfDoc: PDFDocument) => {
	for (let i = 0; i < imagesInDoc.length; i++) {
		if (loadedImages[i]) {
			// console.log('imagesInDoc[i]', i)
			let x = imagesInDoc[i]
			// let blob = new Blob([x.data], { type: getMimeTypeFromExtension(x.type) });
			// let blobUrl = URL.createObjectURL(blob);
			// let downloadLink = document.createElement('a');
			// downloadLink.href = blobUrl;
			// downloadLink.download = 'filename_before'+i;
			// document.body.appendChild(downloadLink);
			// downloadLink.click(); //before compression
			// URL.revokeObjectURL(blobUrl);
			// document.body.removeChild(downloadLink);

			let uint8Array
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			canvas.width = 500; // Set your desired output width
			canvas.height = 500 * (x.height / x.width); // Maintain aspect ratio

			// console.log(loadedImages[i], x.height, x.width, canvas.width, canvas.height)
			// Send the image to the canvas
			if (ctx) ctx.drawImage(loadedImages[i], 0, 0, canvas.width, canvas.height);

			// Get the scaled-down data back from the canvas via canvas.toDataURL
			const scaledDataUrl = canvas.toDataURL("image/jpeg", 0.6); // Set your own output format and quality
			// console.log('scaledDataUrl', scaledDataUrl)

			// Convert the data URL back to an ArrayBuffer
			const byteString = atob(scaledDataUrl.split(',')[1]);
			let arrayBufferFromDataUrl = new ArrayBuffer(byteString.length);
			uint8Array = new Uint8Array(arrayBufferFromDataUrl);
			for (let i = 0; i < byteString.length; i++) {
				uint8Array[i] = byteString.charCodeAt(i);
			}

			// blob = new Blob([uint8Array], { type: getMimeTypeFromExtension(x.type) });
			// blobUrl = URL.createObjectURL(blob);
			// downloadLink = document.createElement('a');
			// downloadLink.href = blobUrl;
			// downloadLink.download = 'filename_after'+i;
			// document.body.appendChild(downloadLink);
			// downloadLink.click();//after compression
			// URL.revokeObjectURL(blobUrl);
			// document.body.removeChild(downloadLink);

			// console.log(x.data.byteLength, uint8Array.byteLength); // Check sizes

			// console.log(x.data, uint8Array)

			let context = (pdfDoc.context as any)
			context.indirectObjects.get(imagesInDoc[i].ref).contents = uint8Array
		}
	}


	// Save compressed PDF
	const compressedPdfBytes = await pdfDoc.save();

	// Return compressed PDF as Blob
	return new Blob([compressedPdfBytes], { type: 'application/pdf' });
}

export default function Home() {

	const [pdfFile, setPdfFile] = useState<File | null>(null);

	const props: UploadProps = {
		accept:'.pdf',
		name: 'file',
		multiple: false,
		action: '',
		// customRequest: ({ file, onSuccess }) => { onSuccess() },
		onChange(info) {
			const { status } = info.file;
			let uploaded_file: File = info.file.originFileObj as File
			setPdfFile(uploaded_file)
			console.log('hereee',uploaded_file)
		},
		onDrop(e) {
			setPdfFile(null)
			console.log('Dropped files', e.dataTransfer.files);
		},
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) setPdfFile(event.target.files[0]);
	};
	const compressPdf = async (file: File): Promise<Blob> => {
		try {
			const pdfDoc: PDFDocument = await PDFDocument.load(await file.arrayBuffer());
			const imagesInDoc: ImageObject[] = [];
			let indirectObjects: [PDFRef, PDFObject][] = pdfDoc.context.enumerateIndirectObjects()
			indirectObjects.forEach(([ref, pdfObject]) => {
				// console.log('pdfObject', pdfObject, ref)
				if (!(pdfObject instanceof PDFRawStream)) return;
				// const {
				// 	dict: {
				// 		dict: dict
				// 	}
				// } = pdfObject;
				const dict = (pdfObject as any).dict;

				const smaskRef = dict.get(PDFName.of('SMask'));
				const colorSpace = dict.get(PDFName.of('ColorSpace'));
				const subtype = dict.get(PDFName.of('Subtype'));
				const width = dict.get(PDFName.of('Width'));
				const height = dict.get(PDFName.of('Height'));
				const name = dict.get(PDFName.of('Name'));
				const bitsPerComponent = dict.get(PDFName.of('BitsPerComponent'));
				const filter = dict.get(PDFName.of('Filter'));
				if (subtype === PDFName.of('Image')) {
					imagesInDoc.push({
						ref,
						smaskRef,
						colorSpace,
						name: name ? name.encodedName : `Object${ref.objectNumber}`,
						width: width.numberValue,
						height: height.numberValue,
						bitsPerComponent: bitsPerComponent.numberValue,
						data: pdfObject.contents,
						type: 'jpg'
					});
				}
			})
			// console.log('imagesInDoc', imagesInDoc)

			var loadedImages: LoadedImages = {};
			var promiseArray = []
			for (let j = 0; j < imagesInDoc.length; j++) {
				let x = imagesInDoc[j]
				// if(x.smaskRef){
				var prom = new Promise(function (resolve, reject) {
					try {
						var img = new Image();
						let blob = new Blob([x.data], { type: getMimeTypeFromExtension(x.type) });
						let blobUrl = URL.createObjectURL(blob);
						img.onload = function () {
							loadedImages[j] = img;
							resolve(1);
						};
						img.src = blobUrl;
						setTimeout(resolve, 1000)
					} catch (e) {
						reject()
						console.error(e)
					}
				});
				promiseArray.push(prom)
				// }
			}
			await Promise.all(promiseArray)
			// console.log('donnee')
			let final: Blob = await imagesLoaded(imagesInDoc, loadedImages, pdfDoc)
			return final;
		} catch (e) {
			console.error(e)
			throw e
		}
	};

	const handleCompress = async () => {
		if (pdfFile) {
			try {
				const compressedPdfBlob: Blob = await compressPdf(pdfFile);
				// const compressedPdfBlob = new Blob([compressedPdfData], {
				// 	type: 'application/pdf',
				// });

				// Download compressed PDF
				const url = window.URL.createObjectURL(compressedPdfBlob);
				const link = document.createElement('a');
				link.href = url;
				link.download = 'compressed_pdf.pdf';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			} catch (error) {
				console.error('Compression error:', error);
			}
		}
	};

	return (
		<main>
			<div style={{ height: '100vh' }} className='px-4 flex flex-col align-middle justify-center'>
				{/* <input type="file" accept=".pdf" onChange={handleFileChange} />
				<button onClick={handleCompress}>Compress PDF</button> */}
				<div className='typewriter text-black text-3xl  font-bold mb-16'>
					In-browser Pdf Compressor.
				</div>
				<div className='mb-4 lg:px-64'>
					<Dragger style={{ backgroundColor: 'white', color: 'white', minHeight: '250px' }} {...props}>
						<p className="ant-upload-drag-icon" style={{}}>
							<InboxOutlined />
						</p>
						<p className="ant-upload-text">Click or drag file to this area to upload</p>
						<p className="ant-upload-hint">
						</p>
					</Dragger>
				</div>
				{
					pdfFile ?
					<div className='flex align-middle justify-center mt-6'>
						<Button onClick={handleCompress} type='primary' size='large'>Compress PDF</Button>
					</div>:''
				}
			</div>
		</main>
	);
}

