# DNTBackEnd

## Requirements

Nodejs > v20, MongoDb using Replica set > v7

## Configuration

### Server

- Clone Backend ở đây
- Mở Cmd chạy `npm install`
- Xóa đuôi .example của file `.env.example` và điền các config phù hợp

### Database(Setup Replica MongoDb in Local), Nếu sử dụng Atlas hay hosting mongo thì không cần

#### Requirement Docker > v24

- Mở terminal, kiểm tra ip của docker bằng lệnh `wsl ifconfig`(windows) `ifconfig`(linux)
- Vào tệp script.sh, thay thế địa chỉ mạng của host thành ipv4 của docker
- chạy `wsl ./script.sh` (windows) hoặc `./script.sh` (Linux)
- Nếu replica set đã được thiết lập thành công, máy tính sẽ log ra `{ok: 1}`
- Đặt giá trị của `MONGO_URI` trong file `.env` theo cú pháp `mongodb://[usn:pw@][host:port1,host:port2,host:port3]/[dbname]?replicaSet=[replicaName]`
- Kiểm tra kết nối bằng cmd `node testConnection.js`. Nếu kết nối thành công sẽ xuất liện dòng log `Connected to MongoDB`

## Running Server  

  `npm run start`
