"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import toast from "react-hot-toast";

import { IProduct } from "@/types/product";
import { useRouter } from "next/navigation";
import { firebaseApp } from "@/libs/firebase";
import { Heading } from "@/components/Heading";
import { ActionBtn } from "@/components/ActionBtn";
import { DataGrid, GridColDef, ptBR } from "@mui/x-data-grid";
import { deleteObject, getStorage, ref } from "firebase/storage";
import { MdCached, MdClose, MdDelete, MdRemoveRedEye } from "react-icons/md";
import { Box, Modal, TextField } from "@mui/material";
import { CustomButton } from "@/components/CustomButton";
import ConfirmationModal from "@/components/ConfirmationModal";

interface ManageProductsClientProps {
  products: IProduct[] | any;
}

export default function ManageProductsClient({
  products,
}: ManageProductsClientProps) {
  const router = useRouter();
  const storage = getStorage(firebaseApp);

  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [disabledInputs, setDisabledInputs] = useState(false);
  const [disabledStockInput, setDisabledStockInput] = useState(true);
  const [productData, setProductData] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [openModalConfirm, setOpenModalConfirm] = useState(false);
  const [dataConfirm, setDataConfirm] = useState({
    id: "",
    grid: [],
  });

  let rows: any = [];

  if (products) {
    rows = products.map((item: IProduct) => {
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        brand: item.brand,
        grid: item.grid,
      };
    });
  }

  const [selectedProduct, setSelectedProduct] = useState<any>(rows[0]);
  const [gridData, setGridData] = useState<any[]>();

  const handleUpdateValue = (event: any) => {
    setProductData({
      ...productData,
      id: selectedProduct?.id,
      [event.target.name]: event.target.value,
    });
  };

  const handleChangeStock = (code: string, newStock: any) => {
    const filteredItem = gridData?.find((item: any) => item.colorCode === code);
    filteredItem.stock = Number(newStock);
    setGridData([...gridData!]);
  };

  const getProductById = (id: string) => {
    const product = rows.filter((item: any) => item.id === id)[0];
    setSelectedProduct(product);
    setOpenModalDetails(true);
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 230 },
    { field: "name", headerName: "Nome", width: 230 },
    {
      field: "price",
      headerName: "Preço (R$)",
      width: 120,
      renderCell: (params) => {
        return <div className="font-bold">{params.row.price}</div>;
      },
    },
    { field: "category", headerName: "Categoria", width: 120 },
    { field: "brand", headerName: "Marca", width: 120 },
    {
      field: "action",
      headerName: "Ações",
      width: 220,
      renderCell: (params) => {
        return (
          <div className="flex justify-between gap-4">
            <ActionBtn
              tooltip="Ver detalhes"
              icon={MdRemoveRedEye}
              onClick={() => getProductById(params.row.id)}
            />
            <ActionBtn
              tooltip="Excluir produto"
              icon={MdDelete}
              onClick={() => {
                setOpenModalConfirm(true);
                setDataConfirm({
                  id: params.row.id,
                  grid: params.row.grid,
                });
              }}
            />
          </div>
        );
      },
    },
  ];

  const handleDelete = useCallback(async (id: string, grid: any[]) => {
    toast("Removendo produto...");

    const handleImageDelete = async () => {
      try {
        for (const item of grid) {
          if (item.image) {
            const imageRef = ref(storage, item.image);
            await deleteObject(imageRef);
            console.log("Image deleted: ", item.image);
          }
        }
      } catch (error) {
        return console.log("Deleting images error: ", error);
      }
    };

    axios
      .delete(`/api/product/${id}`)
      .then((res) => {
        handleImageDelete();
        toast.success("Produto removido do banco de dados!");
        router.refresh();
      })
      .catch((err) => {
        toast.error(
          "Produto com pedido vinculado!"
        );
        console.log(err);
      });
  }, []); // eslint-disable-line

  const style = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };

  const closeModalEnableInputs = () => {
    setDisabledInputs(false);
    setOpenModalDetails(false);
    setDisabledStockInput(true);
    setIsLoading(false);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    if (disabledInputs) {
      axios
        .put("/api/product", {
          id: selectedProduct?.id,
          grid: gridData,
        })
        .then((res) => {
          toast.success("Estoques atualizados!");
          router.refresh();
        })
        .catch((err) => {
          toast.error("Algo deu errado!");
          console.log(err);
        })
        .finally(() => {
          closeModalEnableInputs();
        });
    } else {
      axios
        .put("/api/product", {
          id: productData?.id || selectedProduct.id,
          name: productData?.name || selectedProduct.name,
          price: Number(productData?.price) || selectedProduct.price,
        })
        .then((res) => {
          toast.success("Produto atualizado!");
          router.refresh();
        })
        .catch((err) => {
          toast.error("Algo deu errado!");
          console.log(err);
        })
        .finally(() => {
          closeModalEnableInputs();
        });
    }
  };

  const handleEnableStockInput = () => {
    setDisabledInputs(true);
    setDisabledStockInput(false);
  };

  useEffect(() => {
    setGridData(selectedProduct.grid);
  }, [selectedProduct]);

  const handleConfirm = () => {
    setOpenModalConfirm(false);
    handleDelete(dataConfirm.id, dataConfirm.grid);
  };

  return (
    <div className="max-w-[1100px] m-auto text-xl">
      <ConfirmationModal
        text={"Excluir esse produto?"}
        openModal={openModalConfirm}
        handleConfirm={handleConfirm}
        handleClose={() => setOpenModalConfirm(false)}
      />

      <Modal
        open={openModalDetails}
        onClose={closeModalEnableInputs}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style} className="bg-slate-300">
          <MdClose
            size={20}
            onClick={closeModalEnableInputs}
            className="absolute right-1 top-1 cursor-pointer hover:scale-110 transition duration-200 text-black"
          />

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <TextField
                required
                name="id"
                label="ID"
                variant="outlined"
                id="outlined-basic"
                onChange={handleUpdateValue}
                defaultValue={selectedProduct?.id}
                disabled
              />

              <TextField
                required
                name="name"
                label="Nome"
                variant="outlined"
                id="outlined-basic"
                onChange={handleUpdateValue}
                defaultValue={selectedProduct?.name}
                disabled={disabledInputs}
                sx={{ input: { color: "black" } }}
              />

              <TextField
                required
                name="price"
                label="Preço"
                variant="outlined"
                id="outlined-basic"
                onChange={handleUpdateValue}
                defaultValue={selectedProduct?.price}
                disabled={disabledInputs}
              />

              <div>
                {selectedProduct &&
                  selectedProduct?.grid.map((item: any, index: number) => {
                    return (
                      <div
                        key={item.colorCode}
                        className="flex gap-2 items-center my-2"
                      >
                        <TextField
                          id="outlined-basic"
                          label="Cor"
                          variant="outlined"
                          value={item.color}
                          className="w-[6.8rem]"
                          disabled
                        />
                        <TextField
                          id="outlined-basic"
                          label="Tamanho"
                          variant="outlined"
                          value={item.size}
                          className="w-20"
                          disabled
                          inputProps={{ style: { textAlign: "center" } }}
                        />

                        <TextField
                          id="outlined-basic"
                          label="Estoque"
                          variant="outlined"
                          className="w-20"
                          defaultValue={item.stock}
                          onChange={(e) =>
                            handleChangeStock(item.colorCode, e.target.value)
                          }
                          disabled={disabledStockInput}
                          inputProps={{ style: { textAlign: "center" } }}
                        />

                        {index === 0 && (
                          <div className="-mt-6">
                            <ActionBtn
                              icon={MdCached}
                              tooltip="Atualizar estoque"
                              onClick={handleEnableStockInput}
                              className="text-black"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <CustomButton
              type="submit"
              disabled={isLoading}
              label={isLoading ? "Salvando..." : "Salvar"}
              className="mt-2 bg-shop-btn-bg font-semibold"
            />
          </form>
        </Box>
      </Modal>

      <div className="mb-4 mt-8">
        <Heading title="Editar Produtos" center />
      </div>

      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          pageSizeOptions={[5, 10]}
          disableRowSelectionOnClick
          className="!text-shop-text-default"
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 5 },
            },
          }}
        />
      </div>
    </div>
  );
}
