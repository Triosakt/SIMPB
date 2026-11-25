import { pool } from "../config/db.js";

function getLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 5;
  return Math.min(parsed, 20);
}

export async function listBerita(req, res) {
  const limit = getLimit(req.query.limit);

  const [rows] = await pool.query(
    `SELECT id, judul, slug, isi, thumbnail, tempat,
            status, tanggal_publikasi, created_at
     FROM berita
     WHERE status = 'published'
       AND (tanggal_publikasi IS NULL OR tanggal_publikasi <= CURDATE())
     ORDER BY COALESCE(tanggal_publikasi, DATE(created_at)) DESC,
              created_at DESC, id DESC
     LIMIT ?`,
    [limit]
  );

  res.json({ data: rows });
}

// Detail berita publik: hanya konten yang sudah tayang.
export async function detailBeritaPublik(req, res) {
  const slug = String(req.params.slug || '').trim();
  if (!slug || slug.length > 255) return res.status(404).json({ message: 'Berita tidak ditemukan.' });
  const [rows] = await pool.query(
    `SELECT id, judul, slug, isi, thumbnail, tempat, status, tanggal_publikasi, created_at
     FROM berita
     WHERE slug = ? AND status = 'published'
       AND (tanggal_publikasi IS NULL OR tanggal_publikasi <= CURDATE())
     LIMIT 1`,
    [slug]
  );
  if (!rows.length) return res.status(404).json({ message: 'Berita tidak ditemukan.' });
  res.json({ data: rows[0] });
}

export async function detailPengumumanPublik(req, res) {
  if (!/^[1-9]\d*$/.test(String(req.params.id || ""))) {
    return res.status(404).json({ message: "Pengumuman tidak ditemukan." });
  }
  const [rows] = await pool.query(
    `SELECT id, judul, file, deskripsi, tanggal_pengumuman,
            tanggal_kadaluarsa, status, created_at
     FROM pengumuman
     WHERE id = ? AND status = 'aktif'
       AND (tanggal_pengumuman IS NULL OR tanggal_pengumuman <= CURDATE())
       AND (tanggal_kadaluarsa IS NULL OR tanggal_kadaluarsa >= CURDATE())
     LIMIT 1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: "Pengumuman tidak ditemukan atau sudah tidak aktif." });
  res.json({ data: rows[0] });
}

export async function listPengumuman(req, res) {
  const limit = getLimit(req.query.limit);

  const [rows] = await pool.query(
    `SELECT id, judul, file, deskripsi, tanggal_pengumuman,
            tanggal_kadaluarsa, status, created_at
     FROM pengumuman
     WHERE status = 'aktif'
       AND (tanggal_kadaluarsa IS NULL OR tanggal_kadaluarsa >= CURDATE())
     ORDER BY tanggal_pengumuman DESC, created_at DESC, id DESC
     LIMIT ?`,
    [limit]
  );

  res.json({ data: rows });
}


// Administrasi informasi. GET publik di atas tetap hanya menampilkan konten tayang.
import fs from "fs/promises";
import path from "path";
import { UPLOAD_ROOT } from "../middleware/upload.js";
const mediaRoot=path.join(UPLOAD_ROOT,"informasi");
const validId=value=>/^[1-9]\d*$/.test(String(value||""));
const date=value=>value?String(value).slice(0,10):null;
const mediaUrl=(kind,file)=>file?"/uploads/informasi/"+kind+"/"+file.filename:null;
const ownMedia=(kind,url)=>{
 if(!url||typeof url!=="string")return null;
 const prefix="/uploads/informasi/"+kind+"/";
 if(!url.startsWith(prefix))return null;
 const name=url.slice(prefix.length);
 if(!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|pdf)$/.test(name))return null;
 return path.join(mediaRoot,kind,name);
};
async function unlinkMedia(kind,url){const file=ownMedia(kind,url);if(file)await fs.unlink(file).catch(()=>{});}
function fail(res,message,code=400){return res.status(code).json({message});}
function validate(kind,body){
 const judul=String(body.judul||"").trim();
 if(!judul||judul.length>255)return "Judul wajib diisi (maksimal 255 karakter).";
 if(kind==="berita"){
  if(!String(body.isi||"").trim())return "Isi berita wajib diisi.";
  if(!["draft","published","archived"].includes(body.status))return "Status berita tidak valid.";
 }else{
  if(!["aktif","tidak_aktif"].includes(body.status))return "Status pengumuman tidak valid.";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal_pengumuman||""))return "Tanggal pengumuman wajib diisi.";
  if(body.tanggal_kadaluarsa&&date(body.tanggal_kadaluarsa)<date(body.tanggal_pengumuman))return "Tanggal kedaluwarsa tidak boleh mendahului tanggal pengumuman.";
 }
 return null;
}
const slugify=s=>String(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)||"berita";
export async function adminListBerita(_req,res){const [rows]=await pool.query("SELECT * FROM berita ORDER BY created_at DESC,id DESC LIMIT 200");res.json({data:rows});}
export async function adminListPengumuman(_req,res){const [rows]=await pool.query("SELECT * FROM pengumuman ORDER BY created_at DESC,id DESC LIMIT 200");res.json({data:rows});}
export async function createBerita(req,res){
 const error=validate("berita",req.body);if(error){await unlinkMedia("berita",mediaUrl("berita",req.file));return fail(res,error);}
 try{
  const slug=slugify(req.body.judul)+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  const [result]=await pool.query("INSERT INTO berita (judul,slug,isi,thumbnail,tempat,status,tanggal_publikasi,user_id) VALUES (?,?,?,?,?,?,?,?)",[
   req.body.judul.trim(),slug,req.body.isi.trim(),mediaUrl("berita",req.file),req.body.tempat||null,req.body.status,date(req.body.tanggal_publikasi),req.user.id
  ]);res.status(201).json({id:result.insertId,message:"Berita berhasil ditambahkan."});
 }catch(e){await unlinkMedia("berita",mediaUrl("berita",req.file));throw e;}
}
export async function updateBerita(req,res){
 const error=validate("berita",req.body);if(error||!validId(req.params.id)){await unlinkMedia("berita",mediaUrl("berita",req.file));return fail(res,error||"ID tidak valid.");}
 try{
  const [rows]=await pool.query("SELECT thumbnail FROM berita WHERE id=?",[req.params.id]);
  if(!rows.length){await unlinkMedia("berita",mediaUrl("berita",req.file));return fail(res,"Berita tidak ditemukan.",404);}
  const previous=rows[0].thumbnail,thumbnail=mediaUrl("berita",req.file)||previous;
  await pool.query("UPDATE berita SET judul=?,isi=?,thumbnail=?,tempat=?,status=?,tanggal_publikasi=? WHERE id=?",[
   req.body.judul.trim(),req.body.isi.trim(),thumbnail,req.body.tempat||null,req.body.status,date(req.body.tanggal_publikasi),req.params.id
  ]);
  if(req.file)await unlinkMedia("berita",previous);
  res.json({message:"Berita diperbarui."});
 }catch(e){await unlinkMedia("berita",mediaUrl("berita",req.file));throw e;}
}
export async function deleteBerita(req,res){
 if(!validId(req.params.id))return fail(res,"ID tidak valid.");
 const [rows]=await pool.query("SELECT thumbnail FROM berita WHERE id=?",[req.params.id]);if(!rows.length)return fail(res,"Berita tidak ditemukan.",404);
 await pool.query("DELETE FROM berita WHERE id=?",[req.params.id]);await unlinkMedia("berita",rows[0].thumbnail);res.json({message:"Berita dihapus."});
}
export async function createPengumuman(req,res){
 const error=validate("pengumuman",req.body);if(error){await unlinkMedia("pengumuman",mediaUrl("pengumuman",req.file));return fail(res,error);}
 try{
  const [result]=await pool.query("INSERT INTO pengumuman (judul,file,deskripsi,tanggal_pengumuman,tanggal_kadaluarsa,status,created_by) VALUES (?,?,?,?,?,?,?)",[
   req.body.judul.trim(),mediaUrl("pengumuman",req.file),req.body.deskripsi||null,date(req.body.tanggal_pengumuman),date(req.body.tanggal_kadaluarsa),req.body.status,req.user.id
  ]);res.status(201).json({id:result.insertId,message:"Pengumuman ditambahkan."});
 }catch(e){await unlinkMedia("pengumuman",mediaUrl("pengumuman",req.file));throw e;}
}
export async function updatePengumuman(req,res){
 const error=validate("pengumuman",req.body);if(error||!validId(req.params.id)){await unlinkMedia("pengumuman",mediaUrl("pengumuman",req.file));return fail(res,error||"ID tidak valid.");}
 try{
  const [rows]=await pool.query("SELECT file FROM pengumuman WHERE id=?",[req.params.id]);if(!rows.length){await unlinkMedia("pengumuman",mediaUrl("pengumuman",req.file));return fail(res,"Pengumuman tidak ditemukan.",404);}
  const previous=rows[0].file,file=mediaUrl("pengumuman",req.file)||previous;
  await pool.query("UPDATE pengumuman SET judul=?,file=?,deskripsi=?,tanggal_pengumuman=?,tanggal_kadaluarsa=?,status=? WHERE id=?",[
   req.body.judul.trim(),file,req.body.deskripsi||null,date(req.body.tanggal_pengumuman),date(req.body.tanggal_kadaluarsa),req.body.status,req.params.id
  ]);if(req.file)await unlinkMedia("pengumuman",previous);res.json({message:"Pengumuman diperbarui."});
 }catch(e){await unlinkMedia("pengumuman",mediaUrl("pengumuman",req.file));throw e;}
}
export async function deletePengumuman(req,res){
 if(!validId(req.params.id))return fail(res,"ID tidak valid.");
 const [rows]=await pool.query("SELECT file FROM pengumuman WHERE id=?",[req.params.id]);if(!rows.length)return fail(res,"Pengumuman tidak ditemukan.",404);
 await pool.query("DELETE FROM pengumuman WHERE id=?",[req.params.id]);await unlinkMedia("pengumuman",rows[0].file);res.json({message:"Pengumuman dihapus."});
}
