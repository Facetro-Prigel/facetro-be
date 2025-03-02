const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const genPass = require('../../helper/generator');
const utils = require('../../helper/utils')
exports.run = async () => {
    await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identity_number: "5312421026",
            password: await genPass.generatePassword("X5FuLmw@SrM0XTlo"),
            email: "xmod3905@students.unnes.ac.id",
            telegram_token: "cZQJlk8Ap0",
            telegram_id: 916398968,
            nfc_data: "805427AA",
            signature: "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",
            bbox:[301, 154, 743],
            avatar:"YPuyUGybapISIra0QXOgUUx.jpg",
            role_user: {
                create: {
                    role: {
                        connect: {
                            guard_name: 'super_admin',
                        }
                    }
                }
            }
        }
    })
    const admin_seed = [
        {
          "name": "Dr. Anan Nugroho, S.T., M.Eng.",
          "identity_number": "198409052019031006",
          "password": "$2b$14$i/5OjR2YMwj1qnzYdpEM1OqS12ee3QXbN5UVbWtxB4LXr00ldnjqa",
          "email": "anannugroho@mail.unnes.ac.id",
          "bbox": [
            320,
            237,
            598
          ],
          "avatar": "wWUXMYJhecziAOjNd7STe6S.jpg",
          "signature": "gASVjggAAAAAAACMFW51bXB5LmNvcmUubXVsdGlhcnJheZSMDF9yZWNvbnN0cnVjdJSTlIwFbnVtcHmUjAduZGFycmF5lJOUSwCFlEMBYpSHlFKUKEsBSwFNAAKGlGgDjAVkdHlwZZSTlIwCZjSUiYiHlFKUKEsDjAE8lE5OTkr/////Sv////9LAHSUYolCAAgAAO6Pwj5YANk+H1devyI1kT8l35I+XoLIvtuAXT8nbMM/vXPsPhypiz8u9QA/dF1XvwFkQj/Cszk/Ypmbv5zzEr6co9c99uzZP3FWFr9eNko+g29ov1LUPj/Ibb0/sNXzv6Pfxb60QlK+LDaEPCWhpL+ENSs/uz6kPjpPdD/vkrw/gwQxPjENGb7Rtq8+x5IQv4SNxj5mrn+/yCGXv7Jh977HlWK/LB8TvpJtcj77d3w/WGE6v8zq270AWHG/zWiSPxaIJb/gm4W/EWxhv5nMEMDGOao+BlkpvSw2J79IltS+R9cxv/S6ZL1weQc/HJE8vxgakr5Ss9m94/CmvnH50j4kHTK/r8PEvwBlAr/LMne/5WWrPwuTTj6RPmG/N207v4DBMT+iZiy/6FxfP4OuTr+FCwg/p+wIv5EuAz9SQCW+j391Py2Y7r5/Xwc+GlRQvq2/172nBfc/i2a1Ply2WT5PMXq+Q26+v0qjuL+ZYGu/OijRPs6JjD3obMQ+7HQqPpxM771ZDN2+wQglvwRzCECyN0Q/3haSP2xeDD/HvSs/hcMxvibG674YXY6+NQDhv6XUiD/Lifm+jS2TPkej+T74pke7+CYnwKUusb9llf+8RoP3PApnQT5mAvO+pUKAP5Naqj+5uyW/zjmzv+fZBj/bgOS/acADwOMAdz9tVSW+wjcsP36DZD9CRIM/gOa8v+8C4b7LZ5g/kJ+CP5sXxz/zc98+Htm6vy1kqz9QDH4/C4JpvhvM4j+zBRS/MhnxPv6doD/qz9c/oWAaP1CKNrytnBs+HHXVPjVBMz/wUX49krELP7DDIz8LhrE+SthavwzNA8Clpea9riy+v94gC8D58Ae/qHXOP6NiLr4ZZkI/ayo4PwArHr5Q57i/vHsxP8Fwsb9hHy2+MDljP8zfmL/T3UY+SAcuQNLCgb5bx3U+tTWgv4psYz9JkTm/e4eEP5mwNT/JWiA/FVyDP0Q3cb7nnh9A2FeDPj0zEUBKHZq/xr9ZP+bSZ79qF9s9TrLUPwCCtL1t2nS/M6IMQH0hVj9oOhHA2NEDvaooIkCpcYs+6Zw9P91HET9lJVY/h4U9v+c8WT9kuWM+MVexP0BAAj9N9YA/0miKvd0oCL+tQ8S+XsazPkqyfj+Jtbe+i8IZQDvVxz8CcYu/A/ISPbBdFj/A1cI/aqWBP+N6lj8jZLY/pTk5vjh7TDzJgne/k8hfvygf9T55ftm+LbckvytvBD8iMt6+i0dBPs48E8CqKIQ+tMo+vpZ8YT6+dTU/WVR3vgIunD3jPlO/XFcAv2OuCr/AzQE+8LKGP35Ue7/Al4y/KkF5PxY1tz/4eqU9wGXOvl8U0z60ZIm+MQ+lv1l8I7+LEsW+m4sKvU2AFj+E4rO/8eIXvzmPMD/mYWg/gKuROYkWKj74yMy/8FahPhfmm76Ecr69keIJwCvi8z8vriG+fXplPnLNjD74URm/7xumP3lM3D4/IM0+knbOPvWXEkCZb8k/cvcgPzm7tb/noqA9Nnl1PfscUr8LIpM+9MWDPjbuDb3Az4U/pJQhv2jOgr9B/5a/vQyiP9VKlL7wgby9Mebjv3+/bb8RqJi+RaFEPrGx8r3fdpE/A46dvn7EXz446BO/zGBpu7OcHT+2/8a99nnnv5ngvDzcZL+/xnvvPm3jD7/JeLS/hE+JPiY3ij8vGqA/WqC6vmtr5D/QGeC/NCsfv6Mpcb9FV74/vsztPahulL+s+kg/nAuVvzmHzT6b5YY+Wo7jvzm4rj8Xp00/lFzovbtZLL9Gm5C9beTpP+kDlz9Kxgk+0ipFv0doJMAg+BA/PBtYP+Z9br9ZeTu+/RFFPsB+vT6ys+a/ke9CP44vcb2Rocm9kkdwP6iZMr+X3Bs/slAXPgm4Kj9CEVW/Hl6Xv4LSiz9JJgO/BlKjPhNcCr8szo89gpOGvlhM1z7a/JM/KHTdPvFsQD4heP0+7wQDv8lYEz9/mc29hPAEv4hUBb8N61w/VkPwv/4Rmr44zZS/0BMIQAnDaD6PeJO+IhQLvvb7DT+/a088qLHbPixGuz5/f5a9kz1Wvw3y5z5XtIW//NYlP4qWhT/gwZW/l8Rsv2T1Sz5kcoi9zpIEv6OzUD5KVuI+6TZTPz3cK8D+RS+9GtruvoevO76lRgxAMJwKQNN2zz7s8v2/KEkmv3Fxej4yGSE/XC04P2L+K7/giSE+8+byvoVgn72cSss+MgPQP4DAZb4skF2+JxFbP4whkT8eH1+/BipbP2THfb5IFHm+H+TfP1hJFL6WYj89BwqCvgmhlz4S7G6/x3MrvzRjrL9x6wq/7u5RP3ZGMD/Qm7G/dIGjv6dqqb7vu80+qlavv+L7075o0YC/o6vSP8AjKD9M5Wm/NDvwv87s47vfZ0a+Iy6Fv6xz2D/tIMg92Kkmv0IkpD6FbJQ/Mp0Xv1rlGcAeNPe8hd3EP9V34z8H3rg/rNxWQDrDuT+I+18/Vhhwv3Rppz/Nt8I/xUSjv2iiHz/AHlG9hrQlPVdrTL9H6xc+JWMev7TaAz//lOc+XXeHvz5V075IzGs/w3aSP7LdDr4CmOM9arVGvxxGnz3NFA2/8ME8v9cUlL/tzg1AVu6dvmL4f79qBH0/AnAHwKl2C7+l9J6+an+QPQ6Deb+/QtM+37uxPxRDhz8mDMW/f+VNP2eLdb8COII/zlPevvIVfr9S/iQ/iRW/vj/NBT6CI8E9fuPBv5ZyRL+iRSo/lHSUYi4=",
          "telegram_id": 48318211,
          "telegram_token": "i0uzDBSh8C",
          "nfc_data": "02B2A473"
        },
        {
          "name": "Kevin Muhammad Tegar Aditama",
          "identity_number": "5312422008",
          "password": "$2b$14$eyRZIF6WRt1TZXXdPHv5YOKp7SIUsKUP/ketSrhbdprv0t5b2VOG6",
          "email": "kevinadittama@students.unnes.ac.id",
          "bbox": [
            142,
            406,
            661
          ],
          "avatar": "LW5XtNrekpwJdp3sDvJoAO1.jpg",
          "signature": "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",
          "telegram_id": 1291644350,
          "telegram_token": "kIKXOWDRIp",
          "nfc_data": "3D0219BA"
        },
        {
          "name": "Bagus Fachriansyah",
          "identity_number": "5312422003",
          "password": "$2b$14$VGdOl8aSlmyIuJP5u3n9KuklZ4EGsqhQe8PshF5isVIxNaLH0Ohrm",
          "email": "bagusfahri39@students.unnes.ac.id",
          "bbox": [
            0,
            469,
            1026
          ],
          "avatar": "EhN89CUFsZLUxHfKPbCWO1k.jpg",
          "signature": "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",
          "telegram_id": 1579329428,
          "telegram_token": "r9Cgp1y4Zj",
          "nfc_data": "813D316A"
        },
        {
          "name": "Ahmad Dani",
          "identity_number": "5312422046",
          "password": "$2b$14$ufOElmHLUo5.FIsnF.NAlOB.cW2RQLbKXPpyEWgObj/i9Ls3Nd2Xq",
          "email": "ahmaddani@students.unnes.ac.id",
          "bbox": [
            242,
            338,
            486
          ],
          "avatar": "emovqTpyNHECROi4CSebQL5.jpg",
          "signature": "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",
          "telegram_id": 7367607983,
          
          "telegram_token": "cwTp3UM5ne",
          "nfc_data": "3D0019AF"
        },
        {
          "name": "Muhammad Hanif Al Ghifaari",
          "identity_number": "5312422028",
          "password": "$2b$14$.73og0dRSo7FI9JBDGehp.BaDKNBaX/ytJKVBDZAQPSUaHO0eS8CC",
          "email": "hanifalghi@students.unnes.ac.id",
          "bbox": [
            0,
            14,
            280
          ],
          "avatar": "7BVYrdcLJg0DJQweYhwTanm.jpg",
          "signature": "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",
          "telegram_id": 1190676085,
          "telegram_token": "dJNVfk4KPV",
          "nfc_data": ""
        },
        {
          "name": "Muhamad Kurniawan Fauzi",
          "identity_number": "5312422037",
          "password": "$2b$14$N9yBwSf2ipviGT4ow2z1Bewb0lwF299aV8n3e2mLs3Gd8f9dHHqbm",
          "email": "krnwnfauzi@students.unnes.ac.id",
          "bbox": [
            154,
            153,
            716
          ],
          "avatar": "YesC3X1fqhCO7jZJAqJnMoX.jpg",
          "signature": "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",
          "telegram_id": 1949236643,
          "telegram_token": "qm3T2bODnW",
          "nfc_data": "3D003354"
        },
        {
          "name": "Adil Arundaya",
          "identity_number": "5312422017",
          "password": "$2b$14$dx44xUmIjnDaE6SMianLU.RwA9TB1W6PFiZQpSS7Q2VfSpmZUS87S",
          "email": "adilarundaya@students.unnes.ac.id",
          "bbox": [
            153,
            153,
            717
          ],
          "avatar": "mBp8thOfZQbTQuojac6Bvoc.jpg",
          "signature": "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",
          "telegram_id": 1384181958,
          "telegram_token": "bw5KxDDqzo",
          "nfc_data": "30354223"
        },
        {
          "name": "Aisya Fathimah",
          "identity_number": "5302422036",
          "password": "$2b$14$yOQuVT.pUW0JsgpKNtbUkO/anYBXMX3.EvlFUvI3lAUQdPU9/NQBq",
          "email": "fathimahaisya1@students.unnes.ac.id",
          "bbox": [
            155,
            155,
            714
          ],
          "avatar": "27noZJVSbAWghm2t7soh1GW.jpg",
          "signature": "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",
          "telegram_id": 1069981121,
          "telegram_token": "cyBj28rsLR",
          "nfc_data": "3D00DF8E"
        }
      ];
    for (let items of admin_seed) {
        await prisma.user.create({
            data:
            {
                name: items.name,
                identity_number: items.identity_number,
                password: items.password,
                email: items.email,
                telegram_token: items.telegram_token,
                avatar: items.avatar,
                telegram_id: items.telegram_id,
                nfc_data: items.nfc_data,
                signature: items.signature,
                bbox: items.bbox,
                role_user: {
                    create: {
                        role: {
                            connect: {
                                guard_name: 'admin',
                            }
                        }
                    }
                }
            }
        })
    }
}