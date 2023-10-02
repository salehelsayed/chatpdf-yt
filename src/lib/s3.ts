
import AWS from 'aws-sdk'
//initilize s3 function
export async function uploadToS3(file: File){
    try{
        AWS.config.update({
            accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
        });
        const s3 = new AWS.S3({
            params: {
                Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            },
            region: 'eu-central-1'
            
        });


        const file_key = 'uploads/' + Date.now().toString() + file.name.replace(' ', '-');

        const params = {
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
            Key: file_key,
            Body: file,
        }

        const upload = s3.putObject(params).on('httpUploadProgress', evt => {
            console.log('uploading to s3...', parseInt((evt.loaded*100/evt.total).toString())) + "%";
        }).promise();

 
        await upload.then(data => {
            console.log('successfully uploaded to S3!', file_key);
            const myurl = getS3Url(file_key)
            console.log('myurl', myurl)
        })

        return Promise.resolve({
            file_key,
            file_name: file.name,
        });


    } catch (error) {
        console.error("Error uploading to S3:", error);
        throw error;
    }

}

export function getS3Url(file_key: string){
    //const url = 'https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.eu-central-1.amazonaws.com/${file_key}';
    const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.eu-central-1.amazonaws.com/${file_key}`;
    console.log('PDF URL in S3: ', url)
    return url;
}

