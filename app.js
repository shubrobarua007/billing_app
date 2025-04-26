const express = require('express');
const app = express();
const PORT = 3002;
const fs = require('fs');
const path = require('path');
const os = require('os');
const cors = require("cors");
const puppeteer = require("puppeteer");

app.use(cors());
app.use(express.json());
app.use("/invoices", express.static(path.join(__dirname, "invoices")));
function generateID(){
 return Math.random().toString(36).substring(2,9);
}

const desktopPath = path.join(os.homedir(),'Desktop');
const folderPath = path.join(desktopPath,'BillingAppData');
const filePath = path.join(folderPath, 'products.json');
const invoicesFolder = path.join(__dirname, "invoices");
if(!fs.existsSync(invoicesFolder)){
    fs.mkdirSync(invoicesFolder);
};

let products = [];

if(fs.existsSync(filePath)){
    const savedProducts = fs.readFileSync(filePath, 'utf-8');
    products = JSON.parse(savedProducts);
};

app.get('/',(req, res)=>{
    res.send('Product app is running');
});
app.post('/products', (req, res)=>{
    const data = req.body;
    
    if(!data.title || typeof data.title !== 'string'  ){
        return res.status(400).json({
            error:"Title is required"
        });
    };
    if(data.price === undefined || typeof data.price !== 'number'){
        return res.status(400).json({
            error:"Price is missing"
        });
    };
    if(data.quantity === undefined || typeof data.quantity !== 'number'){
        return res.status(400).json({
            message:'Quantity is missing'
        });
    };

    const price = data.price;
    const quantity = data.quantity;
    const totalPrice = price * quantity;
    const uniqueId = generateID();

    data.totalPrice = totalPrice;
    data.id = uniqueId;

    

    if(!fs.existsSync(folderPath)){
        fs.mkdirSync(folderPath);
        console.log('BillingAppData folder is created in Desktop');
    }else{
        console.log('Folder al ready exists in Desktop');
    }

    products.push(data);
    
    fs.writeFileSync(filePath,JSON.stringify(products, null ,2));
    

    res.status(201).json({
        message:'Product added successfully',
        product: data
    });
});
app.get('/products', (req, res)=>{
    res.status(200).json({
        message:'Products fetch successfully',
        item: products
    })
});
app.delete('/products/:id', (req, res)=>{
    const id = req.params.id;
   const index = products.findIndex((p)=>p.id === id)
   if(index === -1){
    return res.status(404).json({
        error:'Product not found'
    })
   }
    const deletedItem = products.splice(index, 1);

    fs.writeFileSync(filePath, JSON.stringify(products, null , 2));

    if(deletedItem.length > 0){
    return res.status(200).json({
        message:'Item deleted successfully',
        deletedItem: deletedItem[0]
    });
}else{
       return res.status(400).json({
            error:'Product not match with list'
        });
    }
});

app.put('/products/:id',(req ,res )=>{
    const id = req.params.id;
    const updateData = req.body;
    const price = updateData.price;
    const quantity = updateData.quantity;
    const totalPrice = price * quantity;
    updateData.totalPrice = totalPrice;
    const index = products.findIndex((p)=> p.id===id);
    if(!updateData.title || typeof updateData.title !== 'string'){
        return res.status(400).json({
            error:'Title must be String'
        });
    }
    if(updateData.price === undefined || typeof updateData.price !== 'number'){
        return res.status(400).json({
            error:'Price must be Number'
        });
    }
    if(updateData.quantity === undefined || typeof updateData.quantity !== 'number'){
        return res.status(400).json({
            error:'Quantity must be Number'
        });
    }
    
    if(index >= 0 && index < products.length){
        updateData.id = id;
        products[index]= updateData;
       try {
        fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
        return res.status(200).json({
            message:"Product updated successfully",
            updateproduct: updateData,
        });
       } catch (error) {
        console.error("Failed to save updated products:", error);
        return res.status(500).json({
            error: "Failed to write to file"
        });
       }
    }else{
        return res.status(400).json({
            error:'Product not found'
        })
    }
});
app.get('/products/search', (req,res)=>{
    const title = req.query.title;
    if(!title|| typeof title !== 'string'){
        return res.status(400).json({
            error:'Title not found'
        });
    }
    const matchedProduct = products.filter((n)=> n.title.toLowerCase() === title.toLowerCase());
    return res.status(200).json({
        message:'Product match successfully',
        products: matchedProduct
    })
});
app.patch('/products/:id',(req, res)=>{
    const id = req.params.id;
    const index = products.findIndex((p)=> p.id === id);
   
   
    if(index === -1){
        return res.status(400).json({
            error: 'Products not found'
        })
    }
     const updatedData = req.body;
    if(updatedData.title){
        products[index].title = updatedData.title;
    }
    if(updatedData.price !== undefined && typeof updatedData.price === 'number'){
        products[index].price = updatedData.price;
    }
    if(updatedData.quantity !== undefined && typeof updatedData.quantity === 'number'){
        products[index].quantity = updatedData.quantity;
    }
     const price = products[index].price;
    const quantity = products[index].quantity;
    
    products[index].totalPrice =  price * quantity;
    
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2));

    return res.status(200).json({
        message:'Products updated successfully',
        product: products[index]

    });
    
});

app.post('/generate-pdf', async (req, res) => {
    try {
      const { customerName, customerAddress, customerTRN, products, date } = req.body;

  
      // Calculate totals
      const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
      const vat = subtotal * 0.05;
      const grandTotal = subtotal + vat;
  
      // Generate product rows
      const productRows = products.map((p, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${p.title}</td>
          <td> ${p.price.toFixed(2)}</td>
          <td>${p.quantity}</td>
          <td> ${(p.price * p.quantity).toFixed(2)}</td>
          <td> ${(p.price * p.quantity * 0.05).toFixed(2)}</td>
        </tr>
      `).join('');

      //shop logo
        const shopLogoPath = path.resolve(__dirname, "./shoplogo/logo.png");
        let logoBase64 = "";
        if (fs.existsSync(shopLogoPath)) {
            const imageBuffer = fs.readFileSync(shopLogoPath);
            logoBase64 = imageBuffer.toString('base64');
          } else {
            console.log("Logo not found at:", shopLogoPath);
          }

          // 1. Load all 6 logos as Base64
    const logos = [];
    for (let i = 1; i < 12; i++) {
      const logoPath = path.join(__dirname, 'logos', `logo${i}.png`);
      if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        logos.push(`<img src="data:image/png;base64,${logoBase64}" class="logo" alt="Logo ${i}">`);
      }
    }
    // Number to words helper fun
    const convertToWords = (amount)=>{
        const toWords = require("number-to-words").toWords;
        return toWords(amount).replace(/\b\w/g, c => c.toUpperCase())+''+ "Dirhams Only";
    }
    const totalInWords = convertToWords(grandTotal.toFixed(0));

  
      // Generate HTML
      const html = `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BABAR ELECT. & SANITARY WARE - Invoice</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0056b3;
            padding-bottom: 10px;
        }
        .shop-name {
            color: #0056b3;
            font-size: 25px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .shop-info {
            font-size: 16px;
            margin: 3px 0;
        }
        .customer-box {
            display: flex;
            justify-content: space-between;
            background-color: #f5f5f5;
            padding: 10px;
            margin-bottom: 20px;
        }
        .customer-box-right{
            width: 330px;
            border-left: 2px solid black;
            padding: 0 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom:5px;
        }
        th {
            color: black;
            padding: 2px;
            text-align: center;
            border: 1px solid black;
            font-size: 14px;
            
        }
        td {
            font-size: 12px;
            padding: 0;
            border-bottom: 1px solid #ddd;
            border: 1px solid black;
            text-align: center;
        }
        tr:nth-child(even) {
            background-color: white;
        }
        .text-right {
            text-align: center;
        }
        .text-center {
            text-align: center;
        }
        .totals-container {
            display: flex;
            justify-content: space-between;
            padding: 0 10px;
            margin-top: 20px;
            text-align: right;
            font-weight: bold;
        }
        .total-sign{
            position: relative;

        }
        .total-sign p{
            position: absolute;
            width: 180px;
            bottom: 0;
            margin-bottom: 0;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }
        .logo-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin:20px 0;
            justify-content: center;
          }
          .logo {
            width: 50px;
            height: 50px;
          }
          .logo-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .logo-img {
            width: 130px;
            height: 130px;
            border: 2px solid #0056b3;
            object-fit: cover;
        }
        
        .shop-details {
            text-align: left;
        }
        
    </style>
</head>
<body>
    <div class="main-container">
    <div class="header">
    <div class="logo-title">
      <img src="data:image/png;base64,${logoBase64}" class="logo-img" alt="Shop Logo" />
      <div class="shop-details">
        <div class="shop-name">BABAR ELECT. & SANITARY WARE</div>
        <div class="shop-info"><p>P.O.Box: 95574, Al Nabba,Behind Mubarak Center, Sharjah, UAE</br>
        Mobile: 050-6964121, 050-6778814
        Tel: 06-5637266 </br>
        Email: babarelect36@gmail.com
        </p>
        </div>
        
      </div>
    </div>
  </div>
  
      

        <div class="customer-box">
        <div class="customer-box-left">
            <div><strong>Customer Name:</strong> ${customerName}</div>
            <div><strong>Address:</strong> ${customerAddress}</div>
            <div><strong>Customer TRN:</strong> ${customerTRN}</div>
        </div>
        <div class="customer-box-right">
            <div><strong>Date:</strong> ${date}</div>
            <div><strong>Payment Method:</strong> Cash</div>
            <div><strong> TRN:</strong>  100618077000003 </div>
        </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>SL#</th>
                    <th>Description</th>
                    <th class="text-right">Unit Price (AED)</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Total (AED)</th>
                    <th class="text-right">VAT 5%</th>
                </tr>
            </thead>
            <tbody class="tbody">
               ${productRows}
            </tbody>
        </table>

        <div style="font-size: 0.9em; font-style: italic; margin-top: 0px;">In Words: ${totalInWords}</div>

        <div class="totals-container">

            <div class="total-sign">
                <p>Authorised Signature</p>
            </div>
            <div class="totals">
                <div>Subtotal: ${subtotal.toFixed(2)}</div>
                <div>VAT (5%): AED ${vat.toFixed(2)}</div>
                <div style="font-size: 1.2em;">Grand Total: AED ${grandTotal.toFixed(2)}</div>
            </div>
        </div>

        <div class="footer">
            <div>Thank you for your business!</div>
            <div>Terms: Payment due within 7 days</div>
        </div>
        <div class="logo-container">
        ${logos.join('')} <!-- This inserts all 6 logos -->
        </div>
      
    </div>
</body>
</html>
      `;
  
      // Create PDF
      const browser = await puppeteer.launch({
        headless:"new",
        args: ["--no--sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4',
         printBackground:true,
         margin:{
            top:'20px',
            bottom:'0px',
            left:'20px',
            right:'20px'
         }
     });
      await browser.close();
      //Save PDF to local folder
      const folderPath = path.join(__dirname, "invoices");
      if(!fs.existsSync(folderPath)){
        fs.mkdirSync(folderPath);
      } 
      const fileName = `invoice-${customerName.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      const filePath = path.join(folderPath, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      console.log("PDF saved at:",filePath);
  
      // Send PDF to frontend
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdfBuffer);
  
    } catch (error) {
      console.error('PDF Error:', error);
      res.status(500).send('Error generating PDF');
    }
  });


  

  



app.listen(PORT, ()=>{
    console.log(`Test app is running on ${PORT}`);
});