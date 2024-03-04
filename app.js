const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const {PrismaClient} =require('@prisma/client')
const app = express();
app.use(bodyParser.json());
const prisma= new PrismaClient()

const hapus = async (req, res, model) =>{
  const id = req.params.uuid
  const call = eval('prisma.'+model)
  const result = await call.delete({
      where:{
        uuid:id
    }
  });
  res.send(result);
}

const tambah = async (req, res, model) =>{
  const id = req.body
  const call = eval('prisma.'+model)
  const result = await call.create({
    data:id
  })
  res.send(result);
}

const perbarui = async (req, res, model) => {
  const id = req.params.uuid;
  const post = req.body;
  const call = eval('prisma.' + model);
  const result = await call.update({
    where: { uuid: id },
    data: post
  });
  res.send(result);
};

const tampilkan = async (req, res, model) => {
  const id = req.params.uuid;
  const call = eval('prisma.' + model);
  const result = await call.findUnique({
    where: { uuid: id }
  });
  res.send(result);
};

const tampilkansemua = async (req, res, model) => {
  const call = eval('prisma.' + model);
  const result = await call.findMany();
  res.send(result);
};

const method = ['user', 'role', 'permission', 'group', 'device'];
method.forEach(element => {
  app.delete(`/${element}/:uuid`, async (req, res) => {
    hapus(req, res, element);
  });
  app.post(`/${element}`, async (req, res) => {
    tambah(req, res, element);
  });
  app.put(`/${element}/:uuid`, async (req, res) => {
    perbarui(req, res, element);
  });
  app.get(`/${element}/:uuid?`, async (req, res) => {
    const id = req.params.uuid;
    if (id) {
      tampilkan(req, res, element);
    } else {
      tampilkansemua(req, res, element);
    }
  });
});
app.get('/test', async (req, res) => {
  const result = await prisma.user.create({
    data: {
      name: 'Muhammad Iqbal',
      nim: 5312421026,
      password: 'testpassword',
      email: 'xmod3905@students.unnes.ac.id',
      roleuser : {
        create: {
          role: {
            create:{
              name:'Super Admin',
              guardName:'super_admin',
              description: 'like a god at this system that can do anyting'
            }
          }
        }
      }
  }})
  res.json({'status':'ok', result});
});
app.get('/',(req, res) => {
  res.send('Kamu terhubung kok, silahkan kulik lebih lanjut');
});
app.listen(3000, () => {
  console.log("Aplikasi berjalan di port 3000");
});
